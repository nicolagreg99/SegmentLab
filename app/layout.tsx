import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SegmentLab',
  description: 'Personal segment tracker',
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
