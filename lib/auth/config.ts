import NextAuth       from 'next-auth'
import Credentials    from 'next-auth/providers/credentials'
import { db }         from '@/db/client'
import { verifyPassword } from '@/lib/auth/password'
import { z }          from 'zod'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

// Minuti di lock dopo troppi tentativi falliti
const LOCK_THRESHOLD = 10
const LOCK_MINUTES   = 30

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy:  'jwt',
    maxAge:    60 * 60 * 8,  // sessione valida 8 ore
    updateAge: 60 * 60,      // token refreshato ogni ora
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id            = user.id
        token.email         = user.email
        token.emailVerified = (user as any).emailVerified
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id            = token.id as string
        session.user.emailVerified = token.emailVerified as boolean
      }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        // Eseguiamo bcrypt anche se l'utente non esiste per rendere
        // il tempo di risposta uniforme e non rivelare quali email sono registrate
        const valid = await verifyPassword(password, user?.passwordHash ?? null)

        if (!user || !valid) {
          if (user) {
            const attempts = user.failedLoginAttempts + 1
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: attempts,
                // Blocca l'account dopo troppi tentativi falliti
                lockedUntil: attempts >= LOCK_THRESHOLD
                  ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                  : undefined,
              },
            })
          }
          return null
        }

        // Account temporaneamente bloccato per troppi tentativi
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('ACCOUNT_LOCKED')
        }

        // L'utente deve aver verificato l'email prima di poter accedere
        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        // Tutto ok: azzera i tentativi falliti
        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        })

        return {
          id:            user.id,
          email:         user.email,
          name:          user.name,
          emailVerified: user.emailVerified,
        }
      },
    }),

    // Zitadel (o qualsiasi OIDC provider) si aggiunge qui con tre righe.
    // Il resto dell'app non cambia — callbacks, sessione e middleware
    // funzionano identici indipendentemente dal provider.
    //
    // import Zitadel from 'next-auth/providers/zitadel'
    // Zitadel({
    //   issuer:       process.env.ZITADEL_ISSUER,
    //   clientId:     process.env.ZITADEL_CLIENT_ID,
    //   clientSecret: process.env.ZITADEL_CLIENT_SECRET,
    // }),
  ],
})