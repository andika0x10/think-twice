import { validate, type State } from '../core/model'
import { decode, derive, encode } from './crypto'
export async function encryptBackup(state: State, password: string) {
  if (password.length < 8) throw new Error('Password backup minimal 8 karakter.')
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await derive(password, salt),
    new TextEncoder().encode(JSON.stringify(validate(state))),
  )
  return JSON.stringify({
    format: 'thinktwice',
    version: 1,
    iterations: 600_000,
    salt: encode(salt),
    iv: encode(iv),
    data: encode(new Uint8Array(data)),
  })
}
export async function decryptBackup(content: string, password: string): Promise<State> {
  if (content.length > 10_000_000) throw new Error('Ukuran backup maksimal 10 MB.')
  try {
    const envelope = JSON.parse(content)
    if (
      envelope.format !== 'thinktwice' ||
      envelope.version !== 1 ||
      envelope.iterations !== 600_000
    )
      throw new Error()
    const salt = decode(envelope.salt),
      iv = decode(envelope.iv)
    if (salt.length !== 16 || iv.length !== 12) throw new Error()
    const data = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      await derive(password, salt),
      decode(envelope.data),
    )
    return validate(JSON.parse(new TextDecoder().decode(data)))
  } catch {
    throw new Error('Backup tidak valid atau password salah. Data saat ini tetap aman.')
  }
}
export function csv(state: State) {
  const cell = (value: string) =>
    `"${(/^[=+\-@\t\r\n]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
  return (
    '\uFEFF' +
    [
      [
        'Tanggal',
        'Jenis',
        'Nama',
        'Kantong',
        'Kantong tujuan',
        'Nominal',
        'Kategori',
        'Jenis pengeluaran',
        'Catatan',
      ],
      ...state.entries.map((e) => [
        e.at,
        e.kind,
        e.name,
        state.pockets.find((p) => p.id === e.pocketId)?.name ?? '',
        state.pockets.find((p) => p.id === e.toPocketId)?.name ?? '',
        String(e.amount),
        e.category,
        e.need === 'want' ? 'Keinginan' : e.need === 'need' ? 'Kebutuhan' : '',
        e.note,
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  )
}
