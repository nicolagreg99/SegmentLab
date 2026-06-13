import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/db/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { SegmentsClient } from '@/components/segments/SegmentsClient'

export default async function SegmentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const efforts = await db.segmentEffort.findMany({
    where: { userId: session.user.id },
    include: { segment: true },
    orderBy: { date: 'desc' },
    distinct: ['segmentId'],
  })

  // Per ogni segmento, recupera il miglior tempo
  const bestEfforts = await db.segmentEffort.findMany({
    where: {
      userId: session.user.id,
      segmentId: { in: efforts.map(e => e.segmentId) },
      durationSeconds: { gt: 0 },
    },
    orderBy: { durationSeconds: 'asc' },
    distinct: ['segmentId'],
  })

  const bestBySegment = Object.fromEntries(
    bestEfforts.map(e => [e.segmentId, e.durationSeconds])
  )

  const segments = efforts.map((e) => ({
    id: e.segment.id,
    name: e.segment.name,
    distanceMeters: e.segment.distanceMeters,
    elevationGainMeters: e.segment.elevationGainMeters,
    avgGradientPercent: e.segment.avgGradientPercent,
    maxGradientPercent: e.segment.maxGradientPercent,
    startLat: e.segment.startLat,
    startLng: e.segment.startLng,
    endLat: e.segment.endLat,
    endLng: e.segment.endLng,
    points: JSON.parse(e.segment.pointsJson),
    lastRidden: e.date,
    bestTimeSec: bestBySegment[e.segmentId] ?? null,
  }))

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <PageHeader
        eyebrow="Segmenti"
        title="I tuoi segmenti"
        description={`${segments.length} salite rilevate dalle tue attività`}
      />
      <SegmentsClient segments={segments} />
    </div>
  )
}