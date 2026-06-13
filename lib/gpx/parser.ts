import { XMLParser } from 'fast-xml-parser'
import { GpxPoint, Activity } from '@/types'
import { totalDistance, totalElevationGain, totalDuration } from '@/lib/utils/geo'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'trkpt',
})

export function parseGpxPoints(gpxString: string): GpxPoint[] {
  const parsed = xmlParser.parse(gpxString)

  const trackPoints =
    parsed?.gpx?.trk?.trkseg?.trkpt ?? []

  if (trackPoints.length === 0) throw new Error('Nessun punto GPS trovato nel file')

  return trackPoints.map((tp: any) => ({
    lat: parseFloat(tp['@_lat']),
    lng: parseFloat(tp['@_lon']),
    elevation: parseFloat(tp.ele ?? 0),
    time: tp.time ? new Date(tp.time) : undefined,
  })).filter((p: GpxPoint) => !isNaN(p.lat) && !isNaN(p.lng))
}

function extractName(parsed: any): string {
  return parsed?.gpx?.trk?.name?.trim() || 'Attività senza nome'
}

export function gpxToActivity(
  gpxString: string,
  userId: string
): Omit<Activity, 'id' | 'createdAt'> {
  const parsed = xmlParser.parse(gpxString)
  const points = parseGpxPoints(gpxString)

  if (points.length < 2) throw new Error('Traccia troppo corta')

  return {
    userId,
    name: extractName(parsed),
    date: points[0].time ?? new Date(),
    distanceMeters: totalDistance(points),
    elevationGainMeters: totalElevationGain(points),
    durationSeconds: totalDuration(points),
    points,
  }
}