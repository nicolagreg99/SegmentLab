import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { gpxToActivity } from '@/lib/gpx/parser'
import { detectClimbs } from '@/lib/segments/detector'
import { auth } from '@/lib/auth/config'

// Haversine distance in metri tra due coordinate
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MATCH_THRESHOLD_METERS = 100
const MATCH_LENGTH_RATIO     = 0.20

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }
    const userId = session.user.id

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })
    }
    if (!file.name.endsWith('.gpx')) {
      return NextResponse.json({ error: 'Il file deve essere in formato GPX' }, { status: 400 })
    }

    const gpxString = await file.text()
    const activityData = gpxToActivity(gpxString, userId)

    const activity = await db.activity.create({
      data: {
        userId:             activityData.userId,
        name:               activityData.name,
        date:               activityData.date,
        distanceMeters:     activityData.distanceMeters,
        elevationGainMeters: activityData.elevationGainMeters,
        durationSeconds:    activityData.durationSeconds,
        gpxRaw:             gpxString,
      },
    })

    const climbs = detectClimbs(activityData.points)

    // Carica tutti i segmenti esistenti dell'utente per il matching
    const existingSegments = await db.segment.findMany({
      where: { userId },
      select: {
        id:             true,
        startLat:       true,
        startLng:       true,
        endLat:         true,
        endLng:         true,
        distanceMeters: true,
      },
    })

    const savedSegments = await Promise.all(
      climbs.map(async (climb) => {

        // Cerca un segmento esistente con start/end entro soglia e lunghezza simile
        const match = existingSegments.find((s) => {
          const startDist  = haversineMeters(climb.startLat, climb.startLng, s.startLat, s.startLng)
          const endDist    = haversineMeters(climb.endLat,   climb.endLng,   s.endLat,   s.endLng)
          const lengthDiff = Math.abs(climb.distanceMeters - s.distanceMeters) / s.distanceMeters
          return startDist  <= MATCH_THRESHOLD_METERS
              && endDist    <= MATCH_THRESHOLD_METERS
              && lengthDiff <= MATCH_LENGTH_RATIO
        })

        const segment = match
          ? await db.segment.findUnique({ where: { id: match.id } })
          : await db.segment.create({
              data: {
                userId,
                name:               climb.name,
                type:               'CLIMB',
                distanceMeters:     climb.distanceMeters,
                elevationGainMeters: climb.elevationGainMeters,
                avgGradientPercent:  climb.avgGradientPercent,
                maxGradientPercent:  climb.maxGradientPercent,
                startLat:           climb.startLat,
                startLng:           climb.startLng,
                endLat:             climb.endLat,
                endLng:             climb.endLng,
                pointsJson:         JSON.stringify(climb.points),
              },
            })

        if (!segment) return null

        // Evita effort duplicati per la stessa attività+segmento
        const existingEffort = await db.segmentEffort.findFirst({
          where: { segmentId: segment.id, activityId: activity.id },
        })

        if (!existingEffort) {
          const bestEffort = await db.segmentEffort.findFirst({
            where:   { segmentId: segment.id, userId },
            orderBy: { durationSeconds: 'asc' },
          })

          const isPersonalRecord =
            climb.durationSeconds > 0 &&
            (!bestEffort || climb.durationSeconds < bestEffort.durationSeconds)

          if (isPersonalRecord && bestEffort) {
            await db.segmentEffort.update({
              where: { id: bestEffort.id },
              data:  { isPersonalRecord: false },
            })
          }

          await db.segmentEffort.create({
            data: {
              segmentId:       segment.id,
              activityId:      activity.id,
              userId,
              durationSeconds: climb.durationSeconds,
              avgSpeedKmh:     Math.round(climb.avgSpeedKmh * 10) / 10,
              date:            activityData.date,
              isPersonalRecord: climb.durationSeconds === 0 ? false : isPersonalRecord,
            },
          })
        }

        return segment
      })
    )

    const { gpxRaw: _, ...activityResponse } = activity as any

    return NextResponse.json({
      activity:      activityResponse,
      segmentsFound: savedSegments.filter(Boolean).length,
      segments:      savedSegments.filter(Boolean),
    })

  } catch (error) {
    console.error('ERRORE UPLOAD:', error)
    const message = error instanceof Error ? error.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const activities = await db.activity.findMany({
      where:   { userId: session.user.id },
      orderBy: { date: 'desc' },
      select: {
        id:                 true,
        name:               true,
        date:               true,
        distanceMeters:     true,
        elevationGainMeters: true,
        durationSeconds:    true,
        createdAt:          true,
      },
    })

    return NextResponse.json(activities)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}