import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth'
import { encode, verifier } from './crypto'

export interface LockConfig {
  salt: string
  hash: string
  biometric: boolean
  failures: number
  blockedUntil: number
}
const key = 'thinktwice.lock'
// Browser lock is a development convenience. Android always uses Keystore-backed storage.
export async function getLock(): Promise<LockConfig | null> {
  if (Capacitor.isNativePlatform()) return (await SecureStorage.get(key)) as LockConfig | null
  return JSON.parse(localStorage.getItem(key) || 'null')
}
async function store(config: LockConfig) {
  if (Capacitor.isNativePlatform()) await SecureStorage.set(key, { ...config })
  else localStorage.setItem(key, JSON.stringify(config))
}
export async function setPin(pin: string, biometric: boolean) {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN harus terdiri dari 6 digit.')
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)))
  await store({ salt, hash: await verifier(pin, salt), biometric, failures: 0, blockedUntil: 0 })
}
export async function checkPin(pin: string) {
  const config = await getLock()
  if (!config) return
  if (Date.now() < config.blockedUntil)
    throw new Error(
      `Coba lagi dalam ${Math.ceil((config.blockedUntil - Date.now()) / 1000)} detik.`,
    )
  if (!/^\d{6}$/.test(pin) || (await verifier(pin, config.salt)) !== config.hash) {
    config.failures++
    if (config.failures >= 5)
      config.blockedUntil =
        Date.now() + Math.min(3600, 30 * 2 ** Math.min(config.failures - 5, 7)) * 1000
    await store(config)
    throw new Error(
      config.failures >= 5
        ? 'Terlalu banyak percobaan. Tunggu sebelum mencoba lagi.'
        : 'PIN tidak cocok.',
    )
  }
  await store({ ...config, failures: 0, blockedUntil: 0 })
}
export async function clearLock() {
  if (Capacitor.isNativePlatform()) await SecureStorage.remove(key)
  else localStorage.removeItem(key)
}
export async function biometricAvailable() {
  return Capacitor.isNativePlatform() && (await BiometricAuth.checkBiometry()).isAvailable
}
let biometricPending = false
export async function unlockBiometric() {
  if (biometricPending) throw new Error('Tunggu pemeriksaan biometrik selesai.')
  biometricPending = true
  try {
    await authenticateBiometric()
  } finally {
    biometricPending = false
  }
}
async function authenticateBiometric() {
  const config = await getLock()
  if (!config?.biometric || !Capacitor.isNativePlatform())
    throw new Error('Biometrik belum diaktifkan pada perangkat ini.')
  // Enrollment and temporary lockout can change while the app is in the background.
  const availability = await BiometricAuth.checkBiometry()
  if (!availability.isAvailable)
    throw new BiometryError(
      availability.reason || 'Biometrik sedang tidak tersedia.',
      availability.code || BiometryErrorType.biometryNotAvailable,
    )
  await BiometricAuth.authenticate({
    reason: 'Buka Think Twice',
    cancelTitle: 'Gunakan PIN',
    androidTitle: 'Buka Think Twice',
    allowDeviceCredential: false,
  })
}
export function biometricErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  switch (code) {
    case BiometryErrorType.userCancel:
    case BiometryErrorType.userFallback:
      return ''
    case BiometryErrorType.biometryLockout:
      return 'Biometrik dikunci sementara oleh Android. Gunakan PIN atau coba lagi nanti.'
    case BiometryErrorType.biometryNotEnrolled:
      return 'Daftarkan sidik jari atau wajah di pengaturan perangkat, atau gunakan PIN.'
    case BiometryErrorType.biometryNotAvailable:
      return 'Biometrik sedang tidak tersedia. Gunakan PIN atau coba lagi nanti.'
    case BiometryErrorType.systemCancel:
    case BiometryErrorType.appCancel:
      return 'Pemeriksaan biometrik terhenti. Coba lagi atau gunakan PIN.'
    default:
      return 'Biometrik belum berhasil. Coba lagi atau gunakan PIN.'
  }
}
