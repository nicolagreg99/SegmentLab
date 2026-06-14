import bcrypt from 'bcryptjs'

const MIN_LENGTH  = 10
const BCRYPT_ROUNDS = 12

// Dummy hash per timing-safe compare quando l'utente non esiste
const DUMMY_HASH = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxxxxxxxxx'

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < MIN_LENGTH)
    return `La password deve essere di almeno ${MIN_LENGTH} caratteri`
  if (!/[A-Z]/.test(password))
    return 'La password deve contenere almeno una lettera maiuscola'
  if (!/[0-9]/.test(password))
    return 'La password deve contenere almeno un numero'
  if (!/[^A-Za-z0-9]/.test(password))
    return 'La password deve contenere almeno un carattere speciale'
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

// Sempre esegue bcrypt anche se l'utente non esiste — previene timing attack
export async function verifyPassword(
  password: string,
  hash: string | null
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH)
    return false
  }
  return bcrypt.compare(password, hash)
}