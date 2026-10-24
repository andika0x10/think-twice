import { beforeEach, expect, it, vi } from 'vitest'
import { checkPin, clearLock, getLock, setPin, unlockBiometric } from './security'
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))
const memory = new Map<string, string>()
beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  })
})
it('stores a salted verifier, accepts PIN and supports clearing', async () => {
  await setPin('123456', false)
  const config = await getLock()
  expect(config?.hash).not.toBe('123456')
  await expect(checkPin('123456')).resolves.toBeUndefined()
  await expect(checkPin('000000')).rejects.toThrow('tidak cocok')
  await clearLock()
  expect(await getLock()).toBeNull()
})
it('blocks after five failures, persists the deadline and resets on valid PIN', async () => {
  await setPin('654321', false)
  for (let i = 0; i < 5; i++) await expect(checkPin('000000')).rejects.toThrow()
  const config = await getLock()
  expect(config!.failures).toBe(5)
  expect(config!.blockedUntil).toBeGreaterThan(Date.now())
  await expect(checkPin('654321')).rejects.toThrow('Coba lagi')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(config!.blockedUntil + 1)
  await checkPin('654321')
  expect((await getLock())!.failures).toBe(0)
  clock.mockRestore()
})
it('rejects invalid PIN and unavailable biometrics', async () => {
  await expect(setPin('123', false)).rejects.toThrow()
  await expect(unlockBiometric()).rejects.toThrow()
})
