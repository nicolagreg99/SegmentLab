'use client'

import { useEffect, useState } from 'react'
import { SegmentMap } from '@/components/map/SegmentMap'
import { formatDistance } from '@/lib/utils/geo'
import { GpxPoint } from '@/types'

interface Effort {
  id: string
  durationSeconds: number
  avgSpeedKmh: number
  date: string
  isPersonalRecord: boolean
  activity: { id: string; name: string; date: string }
}

interface Segment {
  id: string
  name: string
  distanceMeters: number
  elevationGainMeters: number
  avgGradientPercent: number
  maxGradientPercent: number
  startLat: number
  startLng: number
  points: GpxPoint[]
  lastRidden: Date
  bestTimeSec: number | null
}

interface SegmentsClientProps {
  segments: Segment[]
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function SegmentsClient({ segments }: SegmentsClientProps) {
  const [segmentsState, setSegmentsState] = useState(segments)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>()
  const [efforts, setEfforts] = useState<Effort[]>([])
  const [loadingEfforts, setLoadingEfforts] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function requestLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => {}
    )
  }

  useEffect(() => { requestLocation() }, [])

  useEffect(() => {
    if (!selectedId) {
      setEfforts([])
      return
    }
    setLoadingEfforts(true)
    fetch(`/api/v1/segments/${selectedId}`)
      .then(r => r.json())
      .then(data => setEfforts(data.efforts ?? []))
      .catch(() => setEfforts([]))
      .finally(() => setLoadingEfforts(false))
  }, [selectedId])

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  function startEdit(seg: Segment) {
    setEditingId(seg.id)
    setEditValue(seg.name)
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function saveName(id: string) {
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditError('Il nome non può essere vuoto')
      return
    }
    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/v1/segments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Errore durante il salvataggio')
      }
      setSegmentsState((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s))
      )
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const numberedSegments = segmentsState.map((seg, i) => ({ ...seg, number: i + 1 }))
  const selectedSeg = numberedSegments.find(s => s.id === selectedId) ?? null

  return (
    <div className="flex gap-4 flex-1 min-h-0">

      {/* Lista segmenti */}
      <div className="w-80 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
        <button
          onClick={requestLocation}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800 transition-colors mb-1"
        >
          <span>📍</span>
          {userLocation ? 'Aggiorna posizione' : 'Mostra la mia posizione'}
        </button>

        {numberedSegments.map((seg) => {
          const isSelected = seg.id === selectedId
          const isEditing = editingId === seg.id

          return (
            <div
              key={seg.id}
              onClick={() => !isEditing && handleSelect(seg.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-blue-600/10 border-blue-500/50 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}>
                  {seg.number}
                </span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName(seg.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          disabled={saving}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <button
                          onClick={() => saveName(seg.id)}
                          disabled={saving}
                          title="Salva"
                          className="shrink-0 text-green-400 hover:text-green-300 disabled:opacity-50 text-sm px-1.5 py-1 rounded-lg hover:bg-gray-800"
                        >✓</button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          title="Annulla"
                          className="shrink-0 text-gray-500 hover:text-gray-300 disabled:opacity-50 text-sm px-1.5 py-1 rounded-lg hover:bg-gray-800"
                        >✕</button>
                      </div>
                      {editError && (
                        <p className="text-red-400 text-xs mt-1">{editError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{seg.name}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(seg) }}
                        title="Rinomina segmento"
                        className="shrink-0 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >✏️</button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{formatDistance(seg.distanceMeters)}</span>
                    <span>+{Math.round(seg.elevationGainMeters)}m</span>
                    <span className={`font-medium ${
                      seg.avgGradientPercent > 8 ? 'text-red-400' :
                      seg.avgGradientPercent > 5 ? 'text-yellow-400' : 'text-green-400'
                    }`}>{seg.avgGradientPercent}%</span>
                  </div>

                  {seg.bestTimeSec !== null && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-yellow-400 text-xs">⏱</span>
                      <span className="text-xs font-semibold text-yellow-400">
                        {formatDuration(seg.bestTimeSec)}
                      </span>
                      <span className="text-xs text-gray-600">miglior tempo</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(seg.lastRidden).toLocaleDateString('it-IT', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mappa + cronologia */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex-1 min-h-0">
          <SegmentMap
            segments={numberedSegments}
            selectedId={selectedId}
            userLocation={userLocation}
            onSelect={handleSelect}
          />
        </div>

        {selectedSeg && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shrink-0 max-h-52 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-blue-500 text-white">
                {selectedSeg.number}
              </span>
              {selectedSeg.name} — cronologia
            </h3>

            {loadingEfforts ? (
              <p className="text-xs text-gray-500">Caricamento...</p>
            ) : efforts.length === 0 ? (
              <p className="text-xs text-gray-500">Nessun tempo registrato.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {efforts.map((effort, i) => {
                  const date = new Date(effort.date).toLocaleDateString('it-IT', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })
                  return (
                    <div key={effort.id} className="flex items-center gap-3 text-xs">
                      <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                      <span className={`font-semibold w-16 ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                        {effort.durationSeconds > 0 ? formatDuration(effort.durationSeconds) : '—'}
                      </span>
                      {effort.avgSpeedKmh > 0 && (
                        <span className="text-gray-500 w-16">{effort.avgSpeedKmh} km/h</span>
                      )}
                      {effort.isPersonalRecord && (
                        <span className="text-yellow-400 font-semibold">PR</span>
                      )}
                      <span className="text-gray-600 ml-auto">{date}</span>
                      <a
                        href={`/activities/${effort.activity.id}`}
                        onClick={e => e.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300 truncate max-w-28"
                      >
                        {effort.activity.name}
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}