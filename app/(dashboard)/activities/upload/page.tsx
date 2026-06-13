import { PageHeader } from '@/components/layout/PageHeader'
import { UploadDropzone } from '@/components/activities/UploadDropzone'

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Attività"
        title="Carica un'attività"
        description="Importa un file GPX da Garmin, Wahoo, o qualsiasi dispositivo GPS."
      />
      <UploadDropzone />
    </div>
  )
}