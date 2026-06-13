'use server'

import { db } from '@/db/client'
import bcrypt from 'bcryptjs'
import { signIn, signOut } from '@/lib/auth/config'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  name: z.string().min(2, 'Nome troppo corto'),
  password: z.string().min(8, 'Password minimo 8 caratteri'),
})

export async function register(prevState: any, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { email, name, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { error: 'Email già registrata' }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({ data: { email, name, passwordHash } })

  redirect('/login?registered=1')
}

export async function login(prevState: any, formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email o password errati' }
    }
    throw error // redirect throws, bisogna rilanciarla
  }
}

export async function logout() {
  await signOut({ redirectTo: '/login' })
}