'use server'

import { db }                                    from '@/db/client'
import { signIn, signOut }                       from '@/lib/auth/config'
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

  // Se l'email esiste già rispondiamo comunque con successo per non
  // rivelare quali indirizzi sono già registrati
  if (existing) return { success: true }

  const passwordHash       = await hashPassword(password)
  const verificationToken  = generateToken()
  const verificationExpiry = tokenExpiry(24)

  await db.user.create({
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