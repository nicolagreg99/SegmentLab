import { randomBytes } from 'crypto'

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function tokenExpiry(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}