export const encode = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
export const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
export async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = 600_000,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}
export async function verifier(pin: string, salt: string) {
  return encode(
    new Uint8Array(await crypto.subtle.exportKey('raw', await derive(pin, decode(salt)))),
  )
}
