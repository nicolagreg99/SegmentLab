'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ElevationPoint } from '@/types'
import { formatDistance } from '@/lib/utils/geo'

interface ElevationChartProps {
  data: ElevationPoint[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ElevationPoint
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm">
      <p className="text-gray-400">{formatDistance(d.distanceMeters)}</p>
      <p className="text-white font-medium">{d.elevationMeters} m</p>
      <p className={`font-medium ${d.gradientPercent > 8 ? 'text-red-400' : d.gradientPercent > 4 ? 'text-yellow-400' : 'text-green-400'}`}>
        {d.gradientPercent > 0 ? '+' : ''}{d.gradientPercent}%
      </p>
    </div>
  )
}

export function ElevationChart({ data }: ElevationChartProps) {
  // Campiona i dati se troppi (max 500 punti)
  const sampled = data.length > 500
    ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0)
    : data

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sampled} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="distanceMeters"
          tickFormatter={(v) => formatDistance(v)}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          dataKey="elevationMeters"
          tickFormatter={(v) => `${v}m`}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="elevationMeters"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#elevGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}