import { GpxPoint, ElevationPoint } from '@/types'

const EARTH_RADIUS_METERS = 6371000

// Distanza in metri tra due punti GPS (formula Haversine)
export function distanceBetween(a: GpxPoint, b: GpxPoint): number {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

// Pendenza in percentuale tra due punti
export function gradientPercent(a: GpxPoint, b: GpxPoint): number {
  const distance = distanceBetween(a, b)
  if (distance === 0) return 0
  return ((b.elevation - a.elevation) / distance) * 100
}

// Dislivello positivo totale di una traccia
export function totalElevationGain(points: GpxPoint[]): number {
  let gain = 0
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation
    if (diff > 0) gain += diff
  }
  return gain
}

// Distanza totale di una traccia in metri
export function totalDistance(points: GpxPoint[]): number {
  let distance = 0
  for (let i = 1; i < points.length; i++) {
    distance += distanceBetween(points[i - 1], points[i])
  }
  return distance
}

// Durata in secondi tra primo e ultimo punto
export function totalDuration(points: GpxPoint[]): number {
  const first = points[0]?.time
  const last = points[points.length - 1]?.time
  if (!first || !last) return 0
  return (last.getTime() - first.getTime()) / 1000
}

// Costruisce il profilo altimetrico per i grafici (un punto ogni ~10 metri)
export function buildElevationProfile(points: GpxPoint[]): ElevationPoint[] {
  const profile: ElevationPoint[] = []
  let cumulativeDistance = 0

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      cumulativeDistance += distanceBetween(points[i - 1], points[i])
    }
    const gradient = i > 0 ? gradientPercent(points[i - 1], points[i]) : 0

    profile.push({
      distanceMeters: Math.round(cumulativeDistance),
      elevationMeters: Math.round(points[i].elevation * 10) / 10,
      gradientPercent: Math.round(gradient * 10) / 10,
    })
  }

  return profile
}

// Formatta i secondi in stringa leggibile (es. 1h 23m 45s)
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Formatta i metri in km se > 1000
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}