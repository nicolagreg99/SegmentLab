'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GpxPoint } from '@/types'

interface SegmentMapProps {
  segments: {
    id: string
    points: GpxPoint[]
    name: string
    avgGradientPercent: number
    number: number
  }[]
  selectedId: string | null
  userLocation?: [number, number]
  onSelect?: (id: string) => void
}

const DEFAULT_CENTER: [number, number] = [11.8, 44.5]
const DEFAULT_ZOOM = 6
const USER_ZOOM = 13

function gradientColor(gradient: number) {
  if (gradient > 8) return '#ef4444' // red-500
  if (gradient > 5) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

export function SegmentMap({ segments, selectedId, userLocation, onSelect }: SegmentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Riferimento sempre aggiornato ai segmenti (per leggere nomi aggiornati nei popup
  // senza dover ricreare i layer della mappa)
  const segmentsRef = useRef(segments)
  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  // Inizializza la mappa una sola volta
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false, 
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    mapRef.current = map

    map.on('load', () => {
      segments.forEach((seg) => {
        if (seg.points.length < 2) return
        const coords = seg.points.map(p => [p.lng, p.lat] as [number, number])
        const midpoint = coords[Math.floor(coords.length / 2)]

        // Linea visibile del segmento
        map.addSource(`seg-${seg.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {},
          },
        })

        map.addLayer({
          id: `seg-line-${seg.id}`,
          type: 'line',
          source: `seg-${seg.id}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#4b5563',
            'line-width': 2,
          },
        })

        // Linea "invisibile" più larga, solo per facilitare il click/hover
        map.addLayer({
          id: `seg-hit-${seg.id}`,
          type: 'line',
          source: `seg-${seg.id}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#000000',
            'line-width': 16,
            'line-opacity': 0,
          },
        })

        // Etichetta numerata nel punto centrale del segmento
        map.addSource(`seg-label-${seg.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: midpoint },
            properties: {},
          },
        })

        map.addLayer({
          id: `seg-label-bg-${seg.id}`,
          type: 'circle',
          source: `seg-label-${seg.id}`,
          paint: {
            'circle-radius': 11,
            'circle-color': '#111827',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#9ca3af',
          },
        })

        map.addLayer({
          id: `seg-label-text-${seg.id}`,
          type: 'symbol',
          source: `seg-label-${seg.id}`,
          layout: {
            'text-field': String(seg.number),
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff',
          },
        })

        const interactiveLayers = [
          `seg-hit-${seg.id}`,
          `seg-label-bg-${seg.id}`,
          `seg-label-text-${seg.id}`,
        ]

        // Click → seleziona/deseleziona + popup completo
        const showSelectPopup = (e: maplibregl.MapMouseEvent) => {
          if (popupRef.current) {
            popupRef.current.remove()
            popupRef.current = null
          }

          const current = segmentsRef.current.find(s => s.id === seg.id) ?? seg

          popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 14, maxWidth: '240px' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color:#111827; min-width:160px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:9999px; background:#3b82f6; color:#fff; font-size:11px; font-weight:700; flex-shrink:0;">
                    ${current.number}
                  </span>
                  <span style="font-size:13px; font-weight:600; line-height:1.3;">${current.name}</span>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px; color:#6b7280;">
                  <span>Pendenza media</span>
                  <span style="font-weight:700; color:${gradientColor(current.avgGradientPercent)};">
                    ${current.avgGradientPercent}%
                  </span>
                </div>
              </div>
            `)
            .addTo(map)

          onSelect?.(seg.id)
        }

        // Hover → mostra solo il nome
        const showNamePopup = (e: maplibregl.MapMouseEvent) => {
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove()
            hoverPopupRef.current = null
          }

          const current = segmentsRef.current.find(s => s.id === seg.id) ?? seg

          hoverPopupRef.current = new maplibregl.Popup({ closeButton: false, offset: 14, maxWidth: '220px' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color:#111827; display:flex; align-items:center; gap:8px;">
                <span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:9999px; background:#111827; color:#fff; font-size:10px; font-weight:700; flex-shrink:0;">
                  ${current.number}
                </span>
                <span style="font-size:12px; font-weight:600; line-height:1.3;">${current.name}</span>
              </div>
            `)
            .addTo(map)
        }

        const hideNamePopup = () => {
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove()
            hoverPopupRef.current = null
          }
        }

        interactiveLayers.forEach((layerId) => {
          map.on('click', layerId, showSelectPopup)
          map.on('mouseenter', layerId, (e) => {
            map.getCanvas().style.cursor = 'pointer'
            showNamePopup(e)
          })
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = ''
            hideNamePopup()
          })
        })
      })

      setMapLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Marker della posizione utente
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (userLocation) {
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ color: '#3b82f6' })
          .setLngLat(userLocation)
          .addTo(map)
      } else {
        markerRef.current.setLngLat(userLocation)
      }
    } else if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
  }, [userLocation, mapLoaded])

  // Selezione segmento + posizionamento mappa
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    segments.forEach((seg) => {
      const isSelected = seg.id === selectedId

      if (map.getLayer(`seg-line-${seg.id}`)) {
        map.setPaintProperty(`seg-line-${seg.id}`, 'line-color', isSelected ? '#3b82f6' : '#4b5563')
        map.setPaintProperty(`seg-line-${seg.id}`, 'line-width', isSelected ? 4 : 2)
      }

      if (map.getLayer(`seg-label-bg-${seg.id}`)) {
        map.setPaintProperty(`seg-label-bg-${seg.id}`, 'circle-color', isSelected ? '#3b82f6' : '#111827')
        map.setPaintProperty(`seg-label-bg-${seg.id}`, 'circle-stroke-color', isSelected ? '#bfdbfe' : '#9ca3af')
      }
    })

    const selected = segments.find(s => s.id === selectedId)

    if (selected && selected.points.length >= 2) {
      const coords = selected.points.map(p => [p.lng, p.lat] as [number, number])
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      )
      map.fitBounds(bounds, { padding: 60, duration: 800 })
    } else {
      // Nessun segmento selezionato: chiudi eventuale popup e torna alla posizione utente
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }

      if (userLocation) {
        map.flyTo({ center: userLocation, zoom: USER_ZOOM, duration: 800 })
      } else {
        map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 800 })
      }
    }
  }, [selectedId, userLocation, mapLoaded, segments])

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
}