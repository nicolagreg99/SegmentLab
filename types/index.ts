// Punto GPS grezzo dal file GPX
export interface GpxPoint {
  lat: number
  lng: number
  elevation: number   // metri
  time?: Date
}

// Attività completa (un giro)
export interface Activity {
  id: string
  userId: string
  name: string
  date: Date
  distanceMeters: number
  elevationGainMeters: number
  durationSeconds: number
  points: GpxPoint[]
  createdAt: Date
}

// Segmento (salita o tratto custom)
export interface Segment {
  id: string
  name: string
  type: 'climb' | 'custom'
  distanceMeters: number
  elevationGainMeters: number
  avgGradientPercent: number
  maxGradientPercent: number
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  points: GpxPoint[]
  createdAt: Date
}

// Un tentativo su un segmento (ogni volta che lo percorri)
export interface SegmentEffort {
  id: string
  segmentId: string
  activityId: string
  userId: string
  durationSeconds: number
  avgSpeedKmh: number
  date: Date
  isPersonalRecord: boolean
}

// Punto del profilo altimetrico (per i grafici)
export interface ElevationPoint {
  distanceMeters: number
  elevationMeters: number
  gradientPercent: number
}