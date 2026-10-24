export type Kind = 'income' | 'expense' | 'opening' | 'transfer'
export type Need = 'need' | 'want'
export interface Pocket {
  id: string
  name: string
  color: string
  archived: boolean
  target?: number
  deadline?: string
}
export interface Entry {
  id: string
  pocketId: string
  toPocketId?: string
  kind: Kind
  amount: number
  name: string
  category: string
  need?: Need
  note: string
  at: string
  planId?: string
}
export interface Plan {
  id: string
  pocketId: string
  amount: number
  name: string
  category: string
  need: Need
  note: string
  createdAt: string
  readyAt: string
  status: 'waiting' | 'bought' | 'cancelled'
  resolvedAt?: string
}
export interface State {
  version: 1
  onboarded: boolean
  createdAt: string
  pockets: Pocket[]
  entries: Entry[]
  plans: Plan[]
  settings: { notifications: boolean }
}
export const colors = ['#FFF9D2', '#FFEBCC', '#BFDDF0', '#8CC0EB']
export const categories = [
  'Makanan',
  'Transportasi',
  'Belanja',
  'Tagihan',
  'Kesehatan',
  'Hiburan',
  'Gaji',
  'Lainnya',
]
export const freshState = (): State => ({
  version: 1,
  onboarded: false,
  createdAt: new Date().toISOString(),
  pockets: [],
  entries: [],
  plans: [],
  settings: { notifications: false },
})
export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
export const uid = () => crypto.randomUUID()
export function balances(state: State, id?: string) {
  let total = 0
  for (const e of state.entries) {
    if (!id || e.pocketId === id)
      total += e.kind === 'expense' || e.kind === 'transfer' ? -e.amount : e.amount
    if (e.kind === 'transfer' && (!id || e.toPocketId === id)) total += e.amount
  }
  const reserved = state.plans
    .filter((p) => p.status === 'waiting' && (!id || p.pocketId === id))
    .reduce((sum, p) => sum + p.amount, 0)
  return { total, reserved, available: total - reserved }
}
export function assertAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000)
    throw new Error('Masukkan nominal Rupiah bulat antara 1 dan 1 triliun.')
}
export function validate(state: State): State {
  if (
    !state ||
    state.version !== 1 ||
    typeof state.onboarded !== 'boolean' ||
    !Number.isFinite(Date.parse(state.createdAt)) ||
    !Array.isArray(state.pockets) ||
    !Array.isArray(state.entries) ||
    !Array.isArray(state.plans) ||
    typeof state.settings?.notifications !== 'boolean'
  )
    throw new Error('Format data tidak didukung.')
  const ids = new Set<string>()
  const checkId = (id: string) => {
    if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('ID data tidak valid.')
    ids.add(id)
  }
  const text = (s: unknown, required = false) => {
    if (typeof s !== 'string' || s.length > 2000 || (required && !s.trim()))
      throw new Error('Teks data tidak valid.')
  }
  const date = (s: string) => {
    if (!Number.isFinite(Date.parse(s))) throw new Error('Tanggal tidak valid.')
  }
  for (const p of state.pockets) {
    checkId(p.id)
    text(p.name, true)
    if (!colors.includes(p.color) || typeof p.archived !== 'boolean')
      throw new Error('Kantong tidak valid.')
    if (p.target !== undefined) assertAmount(p.target)
    if (p.deadline) date(p.deadline)
  }
  const pocket = (id: string) => {
    if (!state.pockets.some((p) => p.id === id)) throw new Error('Kantong tidak ditemukan.')
  }
  for (const e of state.entries) {
    checkId(e.id)
    pocket(e.pocketId)
    assertAmount(e.amount)
    date(e.at)
    text(e.name, true)
    text(e.category, true)
    text(e.note)
    if (!['income', 'expense', 'opening', 'transfer'].includes(e.kind))
      throw new Error('Jenis transaksi tidak valid.')
    if (e.kind === 'expense' && !['need', 'want'].includes(e.need!))
      throw new Error('Jenis pengeluaran tidak valid.')
    if (e.kind === 'expense' && e.need === 'want' && !e.planId)
      throw new Error('Keinginan harus berasal dari jeda 24 jam.')
    if (e.kind === 'transfer') {
      pocket(e.toPocketId!)
      if (e.toPocketId === e.pocketId) throw new Error('Pilih dua kantong berbeda.')
    }
  }
  for (const p of state.plans) {
    checkId(p.id)
    pocket(p.pocketId)
    assertAmount(p.amount)
    text(p.name, true)
    text(p.category, true)
    text(p.note)
    date(p.createdAt)
    date(p.readyAt)
    if (
      Date.parse(p.readyAt) - Date.parse(p.createdAt) < 86_400_000 ||
      !['waiting', 'bought', 'cancelled'].includes(p.status) ||
      !['need', 'want'].includes(p.need)
    )
      throw new Error('Rencana tidak valid.')
    if (p.resolvedAt) date(p.resolvedAt)
    if (p.status !== 'waiting' && !p.resolvedAt) throw new Error('Waktu keputusan tidak ditemukan.')
    if (p.status === 'bought' && Date.parse(p.resolvedAt!) < Date.parse(p.readyAt))
      throw new Error('Pembelian belum melewati jeda 24 jam.')
    const linked = state.entries.filter((e) => e.planId === p.id)
    if (
      (p.status === 'bought' && linked.length !== 1) ||
      (p.status !== 'bought' && linked.length !== 0)
    )
      throw new Error('Referensi pembelian tidak valid.')
    if (
      linked.some(
        (e) =>
          e.kind !== 'expense' ||
          e.pocketId !== p.pocketId ||
          e.amount !== p.amount ||
          e.need !== p.need ||
          e.at !== p.resolvedAt,
      )
    )
      throw new Error('Transaksi pembelian tidak cocok.')
  }
  for (const e of state.entries)
    if (e.planId && !state.plans.some((p) => p.id === e.planId))
      throw new Error('Rencana asal tidak ditemukan.')
  for (const p of state.pockets) {
    const b = balances(state, p.id)
    if (!Number.isSafeInteger(b.total) || !Number.isSafeInteger(b.reserved))
      throw new Error('Jumlah saldo melampaui batas pencatatan.')
    if (balances(state, p.id).available < 0)
      throw new Error(`Saldo tersedia di ${p.name} tidak cukup.`)
    if (p.archived && (balances(state, p.id).total !== 0 || balances(state, p.id).reserved !== 0))
      throw new Error('Kosongkan kantong sebelum diarsipkan.')
  }
  if (state.onboarded && !state.pockets.some((p) => !p.archived))
    throw new Error('Minimal satu kantong aktif diperlukan.')
  return state
}
export function change(state: State, action: (draft: State) => void) {
  const draft = structuredClone(state)
  action(draft)
  return validate(draft)
}
export function addEntry(state: State, entry: Omit<Entry, 'id' | 'at'>, now = new Date()) {
  if (entry.kind === 'expense' && entry.need === 'want')
    throw new Error('Keinginan harus dijeda 24 jam.')
  return change(state, (s) => {
    s.entries.push({ ...entry, id: uid(), at: now.toISOString() })
  })
}
export function defer(
  state: State,
  plan: Omit<Plan, 'id' | 'createdAt' | 'readyAt' | 'status'>,
  now = new Date(),
) {
  return change(state, (s) => {
    s.plans.push({
      ...plan,
      id: uid(),
      status: 'waiting',
      createdAt: now.toISOString(),
      readyAt: new Date(now.getTime() + 86_400_000).toISOString(),
    })
  })
}
export function resolve(state: State, id: string, buy: boolean, now = new Date()) {
  return change(state, (s) => {
    const p = s.plans.find((p) => p.id === id)
    if (!p || p.status !== 'waiting') throw new Error('Rencana ini sudah diproses.')
    if (buy && now.getTime() < Date.parse(p.readyAt))
      throw new Error('Tunggu hingga jeda 24 jam selesai.')
    p.status = buy ? 'bought' : 'cancelled'
    p.resolvedAt = now.toISOString()
    if (buy)
      s.entries.push({
        id: uid(),
        pocketId: p.pocketId,
        amount: p.amount,
        name: p.name,
        category: p.category,
        need: p.need,
        note: p.note,
        kind: 'expense',
        at: now.toISOString(),
        planId: p.id,
      })
  })
}
export function weekRange(offset = 0, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}
export function estimate(state: State, pocket: Pocket, now = new Date()) {
  const available = balances(state, pocket.id).available
  if (!pocket.target) return null
  if (available >= pocket.target) return 'Target tercapai'
  const cutoff = now.getTime() - 28 * 86_400_000
  if (Date.parse(state.createdAt) > cutoff) return 'Belum cukup data'
  const net = state.entries
    .filter((e) => Date.parse(e.at) >= cutoff && e.kind !== 'opening')
    .reduce(
      (sum, e) =>
        sum +
        (e.pocketId === pocket.id
          ? e.kind === 'expense' || e.kind === 'transfer'
            ? -e.amount
            : e.amount
          : 0) +
        (e.kind === 'transfer' && e.toPocketId === pocket.id ? e.amount : 0),
      0,
    )
  if (net <= 0) return 'Belum cukup data'
  const days = Math.ceil((pocket.target - available) / (net / 28))
  if (days > 36500) return 'Belum cukup data'
  return `Sekitar ${new Date(now.getTime() + days * 86_400_000).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
}
