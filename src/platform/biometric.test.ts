import { beforeEach, expect, it, vi } from 'vitest'
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { biometricErrorMessage, unlockBiometric } from './security'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: { get: vi.fn() },
}))
vi.mock('@aparajita/capacitor-biometric-auth', async (original) => ({
  ...(await original<object>()),
  BiometricAuth: { checkBiometry: vi.fn(), authenticate: vi.fn() },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(SecureStorage.get).mockResolvedValue({ biometric: true })
  vi.mocked(BiometricAuth.checkBiometry).mockResolvedValue({ isAvailable: true } as Awaited<
    ReturnType<typeof BiometricAuth.checkBiometry>
  >)
})

it('requires enabled biometrics and checks current availability on every attempt', async () => {
  vi.mocked(SecureStorage.get).mockResolvedValueOnce({ biometric: false })
  await expect(unlockBiometric()).rejects.toThrow('belum diaktifkan')
  expect(BiometricAuth.authenticate).not.toHaveBeenCalled()
  await unlockBiometric()
  expect(BiometricAuth.authenticate).toHaveBeenCalledWith(
    expect.objectContaining({ allowDeviceCredential: false, cancelTitle: 'Gunakan PIN' }),
  )
  vi.mocked(BiometricAuth.checkBiometry).mockResolvedValueOnce({
    isAvailable: false,
    code: BiometryErrorType.biometryLockout,
  } as Awaited<ReturnType<typeof BiometricAuth.checkBiometry>>)
  await expect(unlockBiometric()).rejects.toMatchObject({ code: 'biometryLockout' })
  expect(BiometricAuth.authenticate).toHaveBeenCalledTimes(1)
})

it('prevents overlapping prompts and permits retry after cancellation', async () => {
  let cancel!: (reason: unknown) => void
  vi.mocked(BiometricAuth.authenticate).mockImplementationOnce(
    () => new Promise<void>((_, reject) => (cancel = reject)),
  )
  const first = unlockBiometric()
  const result = expect(first).rejects.toMatchObject({ code: 'userCancel' })
  await vi.waitFor(() => expect(BiometricAuth.authenticate).toHaveBeenCalledTimes(1))
  await expect(unlockBiometric()).rejects.toThrow('Tunggu')
  cancel({ code: BiometryErrorType.userCancel })
  await result
  await expect(unlockBiometric()).resolves.toBeUndefined()
  expect(BiometricAuth.authenticate).toHaveBeenCalledTimes(2)
})

it('never treats sensor errors as successful authentication and permits retry', async () => {
  vi.mocked(BiometricAuth.authenticate).mockRejectedValueOnce({ code: 'systemCancel' })
  await expect(unlockBiometric()).rejects.toMatchObject({ code: 'systemCancel' })
  await expect(unlockBiometric()).resolves.toBeUndefined()
})

it('distinguishes cancellation, lockout, enrollment and interruption', () => {
  expect(biometricErrorMessage({ code: 'userCancel' })).toBe('')
  expect(biometricErrorMessage({ code: 'biometryLockout' })).toContain('dikunci sementara')
  expect(biometricErrorMessage({ code: 'biometryNotEnrolled' })).toContain('Daftarkan')
  expect(biometricErrorMessage({ code: 'systemCancel' })).toContain('terhenti')
  expect(biometricErrorMessage(null)).toContain('Coba lagi')
})
