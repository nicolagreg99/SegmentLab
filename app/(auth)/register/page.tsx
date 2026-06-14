'use client'

import { useActionState } from 'react'
import { register }       from '@/lib/auth/actions'
import Link               from 'next/link'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">SegmentLab</h1>
          <p className="text-gray-400 text-sm mt-1">Crea il tuo account</p>
        </div>

        {state?.success ? (
          <div className="space-y-3">
            <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
              <p className="text-green-400 text-sm font-medium">Registrazione completata</p>
              <p className="text-gray-400 text-sm mt-1">
                Controlla la tua email e clicca il link di verifica prima di accedere.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-blue-400 hover:underline"
            >
              Torna al login
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nome</label>
              <input
                name="name"
                type="text"
                required
                autoComplete="name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-gray-500 text-xs mt-1">
                Minimo 10 caratteri, una maiuscola, un numero, un carattere speciale.
              </p>
            </div>

            {state?.error && (
              <p className="text-red-400 text-sm">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {pending ? 'Registrazione...' : 'Registrati'}
            </button>
          </form>
        )}

        {!state?.success && (
          <p className="text-center text-sm text-gray-400">
            Hai già un account?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">Accedi</Link>
          </p>
        )}
      </div>
    </div>
  )
}