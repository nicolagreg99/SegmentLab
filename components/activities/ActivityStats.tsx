import { Card, CardContent } from '@/components/ui/Card'

interface Stat {
  label: string
  value: string
  icon: string
}

interface ActivityStatsProps {
  stats: Stat[]
}

export function ActivityStats({ stats }: ActivityStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex flex-col gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5 tabular-nums">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}