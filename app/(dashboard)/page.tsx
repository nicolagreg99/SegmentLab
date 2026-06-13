import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/db/client'
import { formatDistance } from '@/lib/utils/geo'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActivityStats } from '@/components/activities/ActivityStats'
import { ActivityCard } from '@/components/activities/ActivityCard'

export default async function OverviewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [activitiesCount, segmentEffortsCount, activities, totalDistance, totalElevation] =
    await Promise.all([
      db.activity.count({ where: { userId } }),
      db.segmentEffort.count({ where: { userId } }),
      db.activity.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          date: true,
          distanceMeters: true,
          elevationGainMeters: true,
          durationSeconds: true,
        },
      }),
      db.activity.aggregate({ where: { userId }, _sum: { distanceMeters: true } }),
      db.activity.aggregate({ where: { userId }, _sum: { elevationGainMeters: true } }),
    ])

  const stats = [
    { label: 'Attività', value: activitiesCount.toString(), icon: '🏃' },
    { label: 'Distanza totale', value: formatDistance(totalDistance._sum.distanceMeters ?? 0), icon: '📍' },
    { label: 'Dislivello totale', value: `${Math.round(totalElevation._sum.elevationGainMeters ?? 0)} m`, icon: '⛰️' },
    { label: 'Segmenti percorsi', value: segmentEffortsCount.toString(), icon: '🏁' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Overview"
        title={`Ciao, ${session.user?.name} 👋`}
        description="Ecco il riepilogo delle tue attività su SegmentLab."
      />

      <div className="mb-10">
        <ActivityStats stats={stats} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Attività recenti</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/activities/upload"
              className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              + Carica GPX
            </Link>
            <Link href="/activities" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Vedi tutte →
            </Link>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-gray-300 font-medium mb-1">Nessuna attività ancora</p>
            <p className="text-gray-500 text-sm mb-6">Carica il tuo primo file GPX per iniziare</p>
            <Link
              href="/activities/upload"
              className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors"
            >
              Carica GPX
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <ActivityCard key={a.id} {...a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}