'use client'

import { useActionState, useEffect } from 'react'
import { updateProfile }             from '@/lib/auth/actions'
import { Card, CardContent }         from '@/components/ui/Card'
import { Button }                    from '@/components/ui/Button'

type Profile = {
  gender?:    string | null
  birthYear?: number | null
  weightKg?:  number | null
  heightCm?:  number | null
  bikeType?:  string | null
  bikeCount?: number | null
  bikeBrand?: string | null
  city?:      string | null
  region?:    string | null
}

type Props = {
  name:     string | null
  email:    string
  profile:  Profile
  provider: string
}

function Field({
  label, name, type = 'text', defaultValue, placeholder, min, max, icon,
}: {
  label: string; name: string; type?: string; icon?: string
  defaultValue?: string | number | null; placeholder?: string; min?: number; max?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <i className={`ti ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-[15px]`} aria-hidden="true" />
        )}
        <input
          id={name} name={name} type={type}
          defaultValue={defaultValue ?? ''} placeholder={placeholder} min={min} max={max}
          className={`w-full rounded-xl border border-gray-800 bg-gray-800/40 py-2.5 text-sm text-white placeholder:text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  )
}

function SelectField({
  label, name, defaultValue, options, icon,
}: {
  label: string; name: string; defaultValue?: string | null; icon?: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <i className={`ti ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-[15px] pointer-events-none z-10`} aria-hidden="true" />
        )}
        <select
          id={name} name={name} defaultValue={defaultValue ?? ''}
          className={`w-full rounded-xl border border-gray-800 bg-gray-800/40 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors appearance-none ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        >
          <option value="">—</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}

function Section({
  title, icon, children,
}: {
  title: string; icon: string; children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-800">
          <i className={`ti ${icon} text-gray-500 text-[16px]`} aria-hidden="true" />
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{title}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-6">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

function Avatar({ name }: { name: string | null }) {
  const initials = (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
      <span className="text-blue-400 font-semibold text-lg tracking-wide">{initials}</span>
    </div>
  )
}

export function ProfileClient({ name, email, profile, provider }: Props) {
  const [state, action, pending] = useActionState(updateProfile, null)

  useEffect(() => {
    if (state?.success || state?.error) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state])

  return (
    <form action={action} className="space-y-3">

      {/* Feedback */}
      {state?.success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-800/60 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          <i className="ti ti-circle-check text-[16px]" aria-hidden="true" />
          Profilo aggiornato.
        </div>
      )}
      {state?.error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          <i className="ti ti-alert-circle text-[16px]" aria-hidden="true" />
          {state.error}
        </div>
      )}

      {/* Header card con avatar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={name} />
            <div>
              <p className="text-base font-semibold text-white">{name ?? '—'}</p>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
            <span className="ml-auto text-[11px] font-medium text-gray-600 uppercase tracking-widest border border-gray-800 rounded-lg px-2.5 py-1">
              {provider}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Section title="Account" icon="ti-user">
        <Field label="Nome" name="name" defaultValue={name} placeholder="Il tuo nome" icon="ti-id-badge" />
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">Email</label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/20 px-3 py-2.5">
            <i className="ti ti-mail text-gray-600 text-[15px]" aria-hidden="true" />
            <span className="text-sm text-gray-400">{email}</span>
          </div>
        </div>
      </Section>

      {/* Dati fisici */}
      <Section title="Dati fisici" icon="ti-activity">
        <SelectField label="Sesso" name="gender" defaultValue={profile.gender} icon="ti-gender-bigender"
          options={[{ value: 'male', label: 'Uomo' }, { value: 'female', label: 'Donna' }, { value: 'other', label: 'Altro' }]}
        />
        <Field label="Anno di nascita" name="birthYear" type="number" defaultValue={profile.birthYear}
          placeholder="es. 1990" min={1930} max={new Date().getFullYear() - 10} icon="ti-calendar" />
        <Field label="Peso (kg)" name="weightKg" type="number" defaultValue={profile.weightKg}
          placeholder="es. 72" min={30} max={300} icon="ti-scale" />
        <Field label="Altezza (cm)" name="heightCm" type="number" defaultValue={profile.heightCm}
          placeholder="es. 178" min={100} max={250} icon="ti-ruler" />
      </Section>

      {/* Attrezzatura */}
      <Section title="Attrezzatura" icon="ti-bike">
        <SelectField label="Tipo di bici principale" name="bikeType" defaultValue={profile.bikeType} icon="ti-bike"
          options={[
            { value: 'road',   label: 'Strada' }, { value: 'gravel', label: 'Gravel' },
            { value: 'mtb',    label: 'MTB' },    { value: 'ebike',  label: 'E-bike' },
            { value: 'track',  label: 'Pista' },  { value: 'other',  label: 'Altro' },
          ]}
        />
        <Field label="Numero di bici" name="bikeCount" type="number" defaultValue={profile.bikeCount}
          placeholder="es. 2" min={1} max={20} icon="ti-123" />
        <div className="sm:col-span-2">
          <Field label="Brand / modello" name="bikeBrand" defaultValue={profile.bikeBrand}
            placeholder="es. Colnago C68" icon="ti-tag" />
        </div>
      </Section>

      {/* Zona */}
      <Section title="Zona geografica" icon="ti-map-pin">
        <Field label="Città" name="city" defaultValue={profile.city} placeholder="es. Milano" icon="ti-building" />
        <Field label="Regione" name="region" defaultValue={profile.region} placeholder="es. Lombardia" icon="ti-map" />
      </Section>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending} size="lg">
          {pending
            ? <><i className="ti ti-loader-2 animate-spin mr-2 text-[15px]" aria-hidden="true" />Salvataggio…</>
            : <><i className="ti ti-device-floppy mr-2 text-[15px]" aria-hidden="true" />Salva modifiche</>
          }
        </Button>
      </div>
    </form>
  )
}