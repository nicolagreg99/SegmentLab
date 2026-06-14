import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/db/client'
import { z }                         from 'zod'
import { validatePasswordPolicy, hashPassword } from '@/lib/auth/password'
import { generateToken, tokenExpiry }           from '@/lib/auth/tokens'
import { sendVerificationEmail }                from '@/lib/auth/mailer'
import { checkRateLimit }                       from '@/lib/auth/ratelimit'

const registerSchema = z.object({
  email:    z.string().email('Email non valida'),
  name:     z.string().min(2, 'Nome troppo corto').max(50),
  password: z.string().min(10),
})

export async function POST(req: NextRequest) {
  try {
    const ip    = req.headers.get('x-forwarded-for') ?? 'unknown'
    const limit = checkRateLimit(`register:${ip}`)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova più tardi.' }, { status: 429 })
    }

    const body   = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { email, name, password } = parsed.data

    const policyError = validatePasswordPolicy(password)
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      // Risposta ambigua — non rivela se l'email esiste
      return NextResponse.json({ message: 'Se l\'email è valida riceverai una mail di conferma.' }, { status: 200 })
    }

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

    return NextResponse.json(
      { message: 'Registrazione completata. Controlla la tua email per verificare l\'account.' },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}