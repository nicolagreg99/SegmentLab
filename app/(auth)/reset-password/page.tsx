'use client'

import { useActionState } from 'react'
import { resetPassword }  from '@/lib/auth/actions'
import { useSearchParams } from 'next/navigation'
import { Suspense }        from 'react'
import Link                from 'next/link'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''
  const [state, action, pending] = useActionState(resetPassword, null)

  if (!token) {
    return (
      <p className="text-red-400 text-sm">
        Link non valido.{' '}
        <Link href="/forgot-password" className="text-blue-400 hover:underline">
          Richiedi un nuovo link
        </Link>
      </p>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="block text-sm text-gray-300 mb-1">Nuova password</label>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-gray-500 text-xs mt-1">
          Minimo 10 caratteri, una maiuscola, un numero, un carattere speciale.
        </p>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Conferma password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={10}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {pending ? 'Salvataggio...' : 'Imposta nuova password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Nuova password</h1>
          <p className="text-gray-400 text-sm mt-1">Scegli una password sicura per il tuo account.</p>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}