import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
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
export async function unlockBiometric() {
  const config = await getLock()
  if (!config?.biometric || !Capacitor.isNativePlatform())
    throw new Error('Biometrik belum diaktifkan pada perangkat ini.')
  await BiometricAuth.authenticate({
    reason: 'Buka Think Twice',
    cancelTitle: 'Gunakan PIN',
    allowDeviceCredential: false,
  })
}
