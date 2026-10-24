import { expect, it } from 'vitest'
import { freshState } from '../core/model'
import { csv, decryptBackup, encryptBackup } from './backup'
it('round trips encrypted backups and rejects incorrect passwords or tampering', async () => {
  const state = freshState()
  const file = await encryptBackup(state, 'password-kuat')
  expect(file).not.toContain(state.createdAt)
  expect(await decryptBackup(file, 'password-kuat')).toEqual(state)
  await expect(decryptBackup(file, 'salah')).rejects.toThrow()
  const envelope = JSON.parse(file)
  envelope.data = 'AAAA'
  await expect(decryptBackup(JSON.stringify(envelope), 'password-kuat')).rejects.toThrow()
})
it('rejects malformed schemas and short passwords', async () => {
  await expect(encryptBackup(freshState(), 'short')).rejects.toThrow()
  await expect(decryptBackup('{}', 'password-kuat')).rejects.toThrow()
})
it('escapes CSV formulas, commas and quotes', () => {
  const state = freshState()
  state.entries.push({
    id: 'a',
    pocketId: 'x',
    kind: 'income',
    amount: 5,
    name: '=SUM(1,2)',
    note: '"quoted"',
    category: 'Gaji',
    at: '2026-01-01',
  })
  const text = csv(state)
  expect(text).toContain('"\'=SUM(1,2)"')
  expect(text).toContain('""quoted""')
})
