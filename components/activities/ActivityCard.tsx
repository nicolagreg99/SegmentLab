import Link from 'next/link'
import { formatDistance, formatDuration } from '@/lib/utils/geo'

interface ActivityCardProps {
  id: string
  name: string
  date: Date
  distanceMeters: number
  elevationGainMeters: number
  durationSeconds: number
}

export function ActivityCard({ id, name, date, distanceMeters, elevationGainMeters, durationSeconds }: ActivityCardProps) {
  return (
    <Link
      href={`/activities/${id}`}
      className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 hover:border-gray-600 hover:bg-gray-800/50 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm shrink-0">
          🚴
        </div>
        <div>
          <p className="font-medium group-hover:text-white transition-colors">{name}</p>
          <p className="text-gray-500 text-sm">
            {new Date(date).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm text-gray-400">
        <div className="text-right hidden sm:block">
          <p className="text-white font-medium">{formatDistance(distanceMeters)}</p>
          <p>distanza</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-white font-medium">+{Math.round(elevationGainMeters)} m</p>
          <p>dislivello</p>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">{formatDuration(durationSeconds)}</p>
          <p>durata</p>
        </div>
        <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
      </div>
    </Link>
  )
}