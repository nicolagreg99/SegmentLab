'use client'

import { useState, useRef, DragEvent } from 'react'
import { useRouter } from 'next/navigation'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'error'

export function UploadDropzone() {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function uploadFile(file: File) {
    if (!file.name.endsWith('.gpx')) {
      setError('Il file deve essere in formato .gpx')
      setState('error')
      return
    }

    setState('uploading')
    setError(null)
    setProgress('Caricamento in corso...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/v1/activities', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Errore durante il caricamento')
      }

      setProgress(`Trovate ${data.segmentsFound} salite!`)
      setTimeout(() => router.push(`/activities/${data.activity.id}`), 800)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setState('error')
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setState('idle')
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setState('dragging')
  }

  function onDragLeave() {
    setState('idle')
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const isDragging = state === 'dragging'
  const isUploading = state === 'uploading'

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'}
        ${isUploading ? 'cursor-default pointer-events-none' : ''}
        ${state === 'error' ? 'border-red-500/50' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        className="hidden"
        onChange={onInputChange}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-300 font-medium">{progress}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl">{state === 'error' ? '⚠️' : '📂'}</span>
          <div>
            <p className="text-white font-medium text-lg">
              {isDragging ? 'Rilascia il file qui' : 'Trascina il file GPX qui'}
            </p>
            <p className="text-gray-400 text-sm mt-1">oppure clicca per selezionarlo</p>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-2 bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
          )}
          <p className="text-gray-600 text-xs mt-2">Solo file .gpx</p>
        </div>
      )}
    </div>
  )
}