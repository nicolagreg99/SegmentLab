import { GpxPoint, Segment } from '@/types'
import { distanceBetween, gradientPercent, totalElevationGain } from '@/lib/utils/geo'

// ── Parametri ─────────────────────────────────────────────────────────────────
const ENTRY_GRADIENT     = 3.0   // % soglia entrata salita
const EXIT_GRADIENT      = 1.0   // % soglia uscita (isteresi)
const MIN_LENGTH         = 300   // m lunghezza minima salita
const MIN_ELEV_GAIN      = 10    // m dislivello minimo
const MAX_FLAT_METERS    = 200   // m tratto piatto tollerato dentro una salita
const MERGE_GAP_METERS   = 150   // m gap massimo per unire due salite consecutive
const GAUSSIAN_SIGMA     = 3     // deviazione standard kernel gaussiano (in punti)
const GAUSSIAN_HALF_WIN  = 8     // semi-finestra gaussiana (punti totali = 2*8+1 = 17)

// ── Kernel gaussiano precomputato ─────────────────────────────────────────────
const GAUSSIAN_KERNEL = (() => {
  const k: number[] = []
  for (let i = -GAUSSIAN_HALF_WIN; i <= GAUSSIAN_HALF_WIN; i++) {
    k.push(Math.exp(-(i * i) / (2 * GAUSSIAN_SIGMA * GAUSSIAN_SIGMA)))
  }
  const sum = k.reduce((a, b) => a + b, 0)
  return k.map(v => v / sum)
})()

// ─────────────────────────────────────────────────────────────────────────────

export interface DetectedClimb extends Omit<Segment, 'id' | 'createdAt'> {
  startTime:       Date | null
  endTime:         Date | null
  durationSeconds: number
  avgSpeedKmh:     number
  points:          GpxPoint[]
}

// Pendenza con smoothing gaussiano — molto più robusto su dati GPS rumorosi
function gaussianGradient(points: GpxPoint[], index: number): number {
  const n = points.length
  let elevNum = 0
  let distNum = 0
  let weightSum = 0

  for (let k = 0; k < GAUSSIAN_KERNEL.length; k++) {
    const i = index - GAUSSIAN_HALF_WIN + k
    if (i < 0 || i >= n) continue
    const w = GAUSSIAN_KERNEL[k]

    // Dislivello e distanza pesati rispetto al centro della finestra
    if (i > 0) {
      const rise = (points[i].elevation ?? 0) - (points[i - 1].elevation ?? 0)
      const run  = distanceBetween(points[i - 1], points[i])
      elevNum  += w * rise
      distNum  += w * run
    }
    weightSum += w
  }

  if (distNum === 0 || weightSum === 0) return 0
  return (elevNum / distNum) * 100
}

// Distanza cumulativa tra due indici
function distBetweenIdx(points: GpxPoint[], a: number, b: number): number {
  let d = 0
  for (let i = Math.max(a + 1, 0); i <= Math.min(b, points.length - 1); i++) {
    d += distanceBetween(points[i - 1], points[i])
  }
  return d
}

// Dislivello con metodo dei trapezi (più accurato su elevazione GPS rumorosa)
function trapezoidalElevationGain(points: GpxPoint[]): number {
  let gain = 0
  for (let i = 1; i < points.length; i++) {
    const delta = (points[i].elevation ?? 0) - (points[i - 1].elevation ?? 0)
    if (delta > 0) gain += delta
  }
  return gain
}

// ── Rilevamento salite ────────────────────────────────────────────────────────
export function detectClimbs(points: GpxPoint[]): DetectedClimb[] {
  if (points.length < GAUSSIAN_HALF_WIN * 2) return []

  // 1. Precomputa pendenza gaussiana per ogni punto
  const gradients = points.map((_, i) => gaussianGradient(points, i))

  // 2. Segmentazione con isteresi
  const rawSegments: Array<{ start: number; end: number }> = []
  let inClimb    = false
  let climbStart = 0
  let flatStart  = -1

  for (let i = 0; i < points.length; i++) {
    const g = gradients[i]

    if (!inClimb) {
      if (g >= ENTRY_GRADIENT) {
        inClimb    = true
        climbStart = i
        flatStart  = -1
      }
    } else {
      if (g >= EXIT_GRADIENT) {
        flatStart = -1
      } else {
        if (flatStart === -1) flatStart = i

        const flatDist = distBetweenIdx(points, flatStart, i)
        if (flatDist > MAX_FLAT_METERS) {
          inClimb = false
          rawSegments.push({ start: climbStart, end: flatStart })
          flatStart = -1

          if (g >= ENTRY_GRADIENT) {
            inClimb    = true
            climbStart = i
          }
        }
      }
    }
  }

  if (inClimb) {
    const end = flatStart > -1 ? flatStart : points.length
    rawSegments.push({ start: climbStart, end })
  }

  // 3. Merge di salite separate da un gap breve
  const merged: Array<{ start: number; end: number }> = []
  for (const seg of rawSegments) {
    if (merged.length === 0) {
      merged.push({ ...seg })
      continue
    }

    const last = merged[merged.length - 1]
    const gap  = distBetweenIdx(points, last.end, seg.start)

    if (gap <= MERGE_GAP_METERS) {
      // Unisci: estendi la fine dell'ultimo segmento
      last.end = seg.end
    } else {
      merged.push({ ...seg })
    }
  }

  // 4. Valutazione e filtraggio
  return merged
    .map(({ start, end }) => evaluateClimb(points.slice(start, end)))
    .filter((c): c is DetectedClimb => c !== null)
}

// ── Valutazione singola salita ────────────────────────────────────────────────
function evaluateClimb(points: GpxPoint[]): DetectedClimb | null {
  if (points.length < 2) return null

  let distanceMeters = 0
  for (let i = 1; i < points.length; i++) {
    distanceMeters += distanceBetween(points[i - 1], points[i])
  }

  const elevationGainMeters = trapezoidalElevationGain(points)
  const avgGradientPercent  = distanceMeters > 0
    ? (elevationGainMeters / distanceMeters) * 100
    : 0

  // Pendenza massima su finestra di 10 punti (più stabile del punto singolo)
  let maxGradientPercent = 0
  for (let i = 5; i < points.length - 5; i++) {
    const rise = (points[i + 5].elevation ?? 0) - (points[i - 5].elevation ?? 0)
    const run  = distBetweenIdx(points, i - 5, i + 5)
    if (run > 0) maxGradientPercent = Math.max(maxGradientPercent, (rise / run) * 100)
  }

  if (distanceMeters      < MIN_LENGTH)    return null
  if (elevationGainMeters < MIN_ELEV_GAIN) return null

  const start = points[0]
  const end   = points[points.length - 1]

  const startTime = start.time ?? null
  const endTime   = end.time   ?? null
  const durationSeconds =
    startTime && endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
      : 0
  const avgSpeedKmh =
    durationSeconds > 0
      ? Math.round(((distanceMeters / 1000) / (durationSeconds / 3600)) * 10) / 10
      : 0

  return {
    name:                `Salita ${Math.round(distanceMeters)}m +${Math.round(elevationGainMeters)}m`,
    type:                'climb',
    distanceMeters:      Math.round(distanceMeters),
    elevationGainMeters: Math.round(elevationGainMeters * 10) / 10,
    avgGradientPercent:  Math.round(avgGradientPercent  * 10) / 10,
    maxGradientPercent:  Math.round(maxGradientPercent  * 10) / 10,
    startLat:  start.lat,
    startLng:  start.lng,
    endLat:    end.lat,
    endLng:    end.lng,
    points,
    startTime,
    endTime,
    durationSeconds,
    avgSpeedKmh,
  }
}