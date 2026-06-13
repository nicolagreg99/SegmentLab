import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/db/client'
import { parseGpxPoints } from '@/lib/gpx/parser'
import { buildElevationProfile, formatDistance, formatDuration } from '@/lib/utils/geo'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { TrackMap } from '@/components/map/TrackMap'
import { ElevationChart } from '@/components/charts/ElevationChart'

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const activity = await db.activity.findFirst({
    where: { id, userId: session.user.id },
    include: {
      efforts: {
        include: { segment: true },
        orderBy: { segment: { distanceMeters: 'desc' } },
      },
    },
  })

  if (!activity) notFound()

  const points = parseGpxPoints(activity.gpxRaw)
  const elevationProfile = buildElevationProfile(points)

  const stats = [
    { label: 'Distanza', value: formatDistance(activity.distanceMeters) },
    { label: 'Dislivello', value: `+${Math.round(activity.elevationGainMeters)} m` },
    { label: 'Durata', value: formatDuration(activity.durationSeconds) },
    { label: 'Salite trovate', value: activity.efforts.length.toString() },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow={new Date(activity.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        title={activity.name}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <p className="text-gray-400 text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-80">
          <TrackMap points={points} />
        </Card>

        <Card className="h-80 p-4">
          <p className="text-sm text-gray-400 mb-3 px-1">Profilo altimetrico</p>
          <div className="h-64">
            <ElevationChart data={elevationProfile} />
          </div>
        </Card>
      </div>

      {activity.efforts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Salite rilevate</h2>
          <div className="space-y-2">
            {activity.efforts.map((effort) => (
              <Card key={effort.id} hover>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center text-sm">
                      ⛰️
                    </div>
                    <div>
                      <p className="font-medium text-sm">{effort.segment.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {formatDistance(effort.segment.distanceMeters)} · pendenza media {effort.segment.avgGradientPercent}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-white font-medium">+{Math.round(effort.segment.elevationGainMeters)} m</p>
                    <p className="text-gray-500 text-xs">dislivello</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}