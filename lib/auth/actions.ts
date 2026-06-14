'use server'

import { db }                                    from '@/db/client'
import { signIn, signOut, auth }                from '@/lib/auth/config'
import { AuthError }                             from 'next-auth'
import { redirect }                              from 'next/navigation'
import { headers }                               from 'next/headers'
import { z }                                     from 'zod'
import { checkRateLimit, resetRateLimit }        from '@/lib/auth/ratelimit'
import { validatePasswordPolicy, hashPassword }  from '@/lib/auth/password'
import { generateToken, tokenExpiry }            from '@/lib/auth/tokens'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/auth/mailer'

// ── Registrazione ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email:    z.string().email('Email non valida'),
  name:     z.string().min(2, 'Nome troppo corto').max(50),
  password: z.string().min(10),
})

export async function register(prevState: any, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email:    formData.get('email'),
    name:     formData.get('name'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { email, name, password } = parsed.data

  const policyError = validatePasswordPolicy(password)
  if (policyError) return { error: policyError }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { success: true }

  const passwordHash       = await hashPassword(password)
  const verificationToken  = generateToken()
  const verificationExpiry = tokenExpiry(24)

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      provider:          'credentials',
      emailVerified:     false,
      verificationToken,
      verificationExpiry,
    },
  })

  await sendVerificationEmail(email, verificationToken)

  // Passiamo l'id al client per il secondo step
  return { success: true, userId: user.id }
}

export async function saveProfile(prevState: any, formData: FormData) {
  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { error: 'Utente non trovato' }

  const birthYear = formData.get('birthYear')
  const weight    = formData.get('weight')
  const height    = formData.get('height')

  const profile = {
    // Dati fisici
    gender:    formData.get('gender')    || null,
    birthYear: birthYear ? parseInt(String(birthYear)) : null,
    weightKg:  weight    ? parseFloat(String(weight))  : null,
    heightCm:  height    ? parseFloat(String(height))  : null,

    // Attrezzatura
    bikeType:  formData.get('bikeType')  || null,
    bikeCount: formData.get('bikeCount') ? parseInt(String(formData.get('bikeCount'))) : null,
    bikeBrand: formData.get('bikeBrand') || null,

    // Zona geografica
    city:      formData.get('city')      || null,
    region:    formData.get('region')    || null,
  }

  await db.user.update({
    where: { id: userId },
    data:  { profile },
  })

  return { success: true }
}

// ── Verifica email ────────────────────────────────────────────────────────────

export async function verifyEmail(token: string) {
  const user = await db.user.findUnique({
    where: { verificationToken: token },
  })

  if (!user)              return { error: 'Token non valido' }
  if (user.emailVerified) return { error: 'Email già verificata' }

  if (!user.verificationExpiry || user.verificationExpiry < new Date()) {
    return { error: 'Il link è scaduto. Registrati di nuovo per riceverne uno nuovo.' }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified:      true,
      verificationToken:  null,
      verificationExpiry: null,
    },
  })

  return { success: true }
}

// ── Reinvio email di verifica ─────────────────────────────────────────────────

export async function resendVerificationEmail(prevState: any, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email mancante' }

  const ip    = (await headers()).get('x-forwarded-for') ?? 'unknown'
  const limit = checkRateLimit(`resend:${ip}`)
  if (!limit.allowed) return { error: 'Troppi tentativi. Riprova più tardi.' }

  const user = await db.user.findUnique({ where: { email } })

  // Risposta ambigua anche qui
  if (user && !user.emailVerified && user.provider === 'credentials') {
    const verificationToken  = generateToken()
    const verificationExpiry = tokenExpiry(24)

    await db.user.update({
      where: { id: user.id },
      data:  { verificationToken, verificationExpiry },
    })

    await sendVerificationEmail(email, verificationToken)
  }

  return { success: true }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(prevState: any, formData: FormData) {
  const ip    = (await headers()).get('x-forwarded-for') ?? 'unknown'
  const email = String(formData.get('email') ?? '')

  // Rate limit doppio: per IP (blocca attacchi distribuiti su email diverse)
  // e per email (blocca brute force su un singolo account)
  const ipLimit    = checkRateLimit(`login:ip:${ip}`)
  const emailLimit = checkRateLimit(`login:email:${email}`)

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const wait = Math.ceil((ipLimit.remainingMs ?? emailLimit.remainingMs ?? 0) / 60000)
    return { error: `Troppi tentativi. Riprova tra ${wait} minuti.` }
  }

  try {
    await signIn('credentials', {
      email,
      password:   formData.get('password'),
      redirectTo: '/',
    })

    resetRateLimit(`login:ip:${ip}`)
    resetRateLimit(`login:email:${email}`)
  } catch (error) {
    if (error instanceof AuthError) {
      // NextAuth wrappa gli errori dell'authorize dentro error.cause
      const cause = (error as any).cause?.err?.message

      if (cause === 'EMAIL_NOT_VERIFIED') {
        return {
          error:      'Email non ancora verificata. Controlla la tua casella e clicca il link che ti abbiamo inviato.',
          unverified: true,
          email,
        }
      }

      if (cause === 'ACCOUNT_LOCKED') {
        return {
          error: 'Account temporaneamente bloccato per troppi tentativi. Riprova tra 30 minuti o reimposta la password.',
        }
      }

      return { error: 'Email o password errati' }
    }
    throw error
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout() {
  await signOut({ redirectTo: '/login' })
}

// ── Richiesta reset password ──────────────────────────────────────────────────

const resetRequestSchema = z.object({
  email: z.string().email(),
})

export async function requestPasswordReset(prevState: any, formData: FormData) {
  const parsed = resetRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: 'Email non valida' }

  const ip    = (await headers()).get('x-forwarded-for') ?? 'unknown'
  const limit = checkRateLimit(`reset:${ip}`)
  if (!limit.allowed) return { error: 'Troppi tentativi. Riprova più tardi.' }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } })

  // Il reset è disponibile solo per account locali — gli utenti federati
  // (Zitadel, Google, ecc.) gestiscono la password sul loro identity provider
  if (user && user.provider === 'credentials') {
    const token  = generateToken()
    const expiry = tokenExpiry(1)

    await db.user.update({
      where: { id: user.id },
      data:  { verificationToken: token, verificationExpiry: expiry },
    })

    await sendPasswordResetEmail(user.email!, token)
  }

  // Risposta sempre identica per non rivelare se l'email è registrata
  return { success: true }
}

// ── Reset password ────────────────────────────────────────────────────────────

const resetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(10),
})

export async function resetPassword(prevState: any, formData: FormData) {
  const password        = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (password !== confirmPassword) {
    return { error: 'Le password non coincidono' }
  }

  const parsed = resetSchema.safeParse({
    token: formData.get('token'),
    password,
  })

  if (!parsed.success) return { error: 'Dati non validi' }

  const policyError = validatePasswordPolicy(parsed.data.password)
  if (policyError) return { error: policyError }

  const user = await db.user.findUnique({
    where: { verificationToken: parsed.data.token },
  })

  if (!user) return { error: 'Link non valido' }

  if (!user.verificationExpiry || user.verificationExpiry < new Date()) {
    return { error: 'Il link è scaduto. Richiedine uno nuovo dalla pagina di login.' }
  }

  const passwordHash = await hashPassword(parsed.data.password)

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Se l'utente resetta la password, consideriamo l'email verificata —
      // ha comunque dimostrato di avere accesso alla casella
      emailVerified:       true,
      verificationToken:   null,
      verificationExpiry:  null,
      failedLoginAttempts: 0,
      lockedUntil:         null,
    },
  })

  redirect('/login?reset=1')
}

// ── Aggiornamento profilo ─────────────────────────────────────────────────────

const profileSchema = z.object({
  name:      z.string().min(2, 'Nome troppo corto').max(50).optional(),
  gender:    z.enum(['male', 'female', 'other']).nullable().optional(),
  birthYear: z.coerce.number().int().min(1930).max(new Date().getFullYear() - 10).nullable().optional(),
  weightKg:  z.coerce.number().min(30).max(300).nullable().optional(),
  heightCm:  z.coerce.number().min(100).max(250).nullable().optional(),
  bikeType:  z.string().max(50).nullable().optional(),
  bikeCount: z.coerce.number().int().min(1).max(20).nullable().optional(),
  bikeBrand: z.string().max(50).nullable().optional(),
  city:      z.string().max(100).nullable().optional(),
  region:    z.string().max(100).nullable().optional(),
})

export async function updateProfile(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const raw = {
    name:      formData.get('name')      || undefined,
    gender:    formData.get('gender')    || null,
    birthYear: formData.get('birthYear') || null,
    weightKg:  formData.get('weightKg')  || null,
    heightCm:  formData.get('heightCm')  || null,
    bikeType:  formData.get('bikeType')  || null,
    bikeCount: formData.get('bikeCount') || null,
    bikeBrand: formData.get('bikeBrand') || null,
    city:      formData.get('city')      || null,
    region:    formData.get('region')    || null,
  }

  const parsed = profileSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { name, ...profileFields } = parsed.data

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { profile: true },
  })

  const existingProfile = (user?.profile ?? {}) as Record<string, unknown>

  await db.user.update({
    where: { id: session.user.id },
    data:  {
      ...(name ? { name } : {}),
      profile: { ...existingProfile, ...profileFields },
    },
  })

  return { success: true }
}