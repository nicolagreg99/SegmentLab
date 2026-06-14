import { verifyEmail } from '@/lib/auth/actions'
import Link            from 'next/link'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <AuthCard title="Link non valido">
        <p className="text-gray-400 text-sm">Il link di verifica non è valido o è scaduto.</p>
        <Link href="/login" className="block text-center text-sm text-blue-400 hover:underline mt-4">
          Torna al login
        </Link>
      </AuthCard>
    )
  }

  const result = await verifyEmail(token)

  return (
    <AuthCard title={result.success ? 'Email verificata' : 'Errore'}>
      {result.success ? (
        <>
          <p className="text-gray-400 text-sm">
            Il tuo account è stato verificato. Puoi ora accedere.
          </p>
          <Link
            href="/login"
            className="block w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
          >
            Accedi
          </Link>
        </>
      ) : (
        <>
          <p className="text-red-400 text-sm">{result.error}</p>
          <Link href="/login" className="block text-center text-sm text-blue-400 hover:underline mt-4">
            Torna al login
          </Link>
        </>
      )}
    </AuthCard>
  )
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-4 p-8 bg-gray-900 rounded-xl border border-gray-800">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {children}
      </div>
    </div>
  )
}