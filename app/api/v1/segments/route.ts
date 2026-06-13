import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/db/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const efforts = await db.segmentEffort.findMany({
    where: { userId: session.user.id },
    include: {
      segment: true,
    },
    orderBy: { date: 'desc' },
    distinct: ['segmentId'],
  })

  const segments = efforts.map((e) => ({
    id: e.segment.id,
    name: e.segment.name,
    type: e.segment.type,
    distanceMeters: e.segment.distanceMeters,
    elevationGainMeters: e.segment.elevationGainMeters,
    avgGradientPercent: e.segment.avgGradientPercent,
    maxGradientPercent: e.segment.maxGradientPercent,
    startLat: e.segment.startLat,
    startLng: e.segment.startLng,
    endLat: e.segment.endLat,
    endLng: e.segment.endLng,
    lastRidden: e.date,
    effortsCount: 0,
  }))

  return NextResponse.json(segments)
}