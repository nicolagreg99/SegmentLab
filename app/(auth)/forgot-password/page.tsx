'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/lib/auth/actions'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Password dimenticata</h1>
          <p className="text-gray-400 text-sm mt-1">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        {state?.success ? (
          <div className="space-y-4">
            <p className="text-green-400 text-sm">
              Se l&apos;email è associata a un account riceverai un link a breve.
            </p>
            <Link href="/login" className="block text-center text-sm text-blue-400 hover:underline">
              Torna al login
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
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
              {pending ? 'Invio...' : 'Invia link di reset'}
            </button>

            <Link href="/login" className="block text-center text-sm text-gray-400 hover:text-white transition-colors">
              Torna al login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}