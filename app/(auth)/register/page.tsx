'use client'

import { useActionState } from 'react'
import { register, saveProfile } from '@/lib/auth/actions'
import Link from 'next/link'

const BIKE_TYPES = [
  { value: 'road',   label: 'Bici da strada' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'mtb',    label: 'MTB' },
  { value: 'ebike',  label: 'E-bike' },
  { value: 'tt',     label: 'Crono / TT' },
]

const REGIONS = [
  "Valle d'Aosta", 'Piemonte', 'Liguria', 'Lombardia', 'Trentino-Alto Adige',
  'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna', 'Toscana', 'Marche',
  'Umbria', 'Lazio', 'Abruzzo', 'Molise', 'Campania', 'Puglia',
  'Basilicata', 'Calabria', 'Sicilia', 'Sardegna',
]

export default function RegisterPage() {
  const [registerState, registerAction, registerPending] = useActionState(register, null)
  const [profileState,  profileAction,  profilePending]  = useActionState(saveProfile, null)

  // Step 2: dati profilo, mostrato dopo registrazione riuscita
  if (registerState?.success && registerState?.userId && !profileState?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 py-12">
        <div className="w-full max-w-lg space-y-6 p-8 bg-gray-900 rounded-xl border border-gray-800">
          <div>
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-1">
              Passo 2 di 2
            </p>
            <h1 className="text-2xl font-bold text-white">Completa il profilo</h1>
            <p className="text-gray-400 text-sm mt-1">
              Tutti i campi sono opzionali. Puoi completarli anche dopo dal profilo.
            </p>
          </div>

          <form action={profileAction} className="space-y-6">
            <input type="hidden" name="userId" value={registerState.userId} />

            {/* Dati fisici */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3 pb-2 border-b border-gray-800">
                Dati fisici
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Sesso</label>
                  <select
                    name="gender"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">—</option>
                    <option value="m">Uomo</option>
                    <option value="f">Donna</option>
                    <option value="other">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Anno di nascita</label>
                  <input
                    name="birthYear"
                    type="number"
                    min={1930}
                    max={new Date().getFullYear() - 10}
                    placeholder="es. 1990"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Peso (kg)</label>
                  <input
                    name="weight"
                    type="number"
                    min={30}
                    max={250}
                    step={0.1}
                    placeholder="es. 70"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Altezza (cm)</label>
                  <input
                    name="height"
                    type="number"
                    min={100}
                    max={250}
                    placeholder="es. 175"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Attrezzatura */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3 pb-2 border-b border-gray-800">
                Attrezzatura
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo di bici principale</label>
                  <select
                    name="bikeType"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">—</option>
                    {BIKE_TYPES.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Numero di bici</label>
                  <input
                    name="bikeCount"
                    type="number"
                    min={1}
                    max={20}
                    placeholder="es. 2"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Marca bici principale</label>
                  <input
                    name="bikeBrand"
                    type="text"
                    placeholder="es. Pinarello, Canyon, Trek..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Zona geografica */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3 pb-2 border-b border-gray-800">
                Zona geografica
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Città</label>
                  <input
                    name="city"
                    type="text"
                    placeholder="es. Milano"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Regione</label>
                  <select
                    name="region"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">—</option>
                    {REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {profileState?.error && (
              <p className="text-red-400 text-sm">{profileState.error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={profilePending}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {profilePending ? 'Salvataggio...' : 'Salva e continua'}
              </button>
              <Link
                href="/login"
                className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-center"
              >
                Salta
              </Link>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Step finale: registrazione completata (con o senza profilo)
  if (profileState?.success || (registerState?.success && !registerState?.userId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-full max-w-sm space-y-4 p-8 bg-gray-900 rounded-xl border border-gray-800">
          <h1 className="text-2xl font-bold text-white">Quasi fatto</h1>
          <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
            <p className="text-green-400 text-sm font-medium">Registrazione completata</p>
            <p className="text-gray-400 text-sm mt-1">
              Controlla la tua email e clicca il link di verifica per attivare l&apos;account.
            </p>
          </div>
          <Link
            href="/login"
            className="block text-center text-sm text-blue-400 hover:underline"
          >
            Torna al login
          </Link>
        </div>
      </div>
    )
  }

  // Step 1: credenziali base
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div>
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-1">
            Passo 1 di 2
          </p>
          <h1 className="text-2xl font-bold text-white">Crea account</h1>
          <p className="text-gray-400 text-sm mt-1">I campi con * sono obbligatori</p>
        </div>

        <form action={registerAction} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Nome <span className="text-blue-400">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Email <span className="text-blue-400">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Password <span className="text-blue-400">*</span>
            </label>
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

          {registerState?.error && (
            <p className="text-red-400 text-sm">{registerState.error}</p>
          )}

          <button
            type="submit"
            disabled={registerPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {registerPending ? 'Registrazione...' : 'Continua'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Hai già un account?{' '}
          <Link href="/login" className="text-blue-400 hover:underline">Accedi</Link>
        </p>
      </div>
    </div>
  )
}