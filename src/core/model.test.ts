import { describe, expect, it } from 'vitest'
import {
  addEntry,
  balances,
  change,
  defer,
  freshState,
  resolve,
  validate,
  weekRange,
  type State,
} from './model'
function fixture(): State {
  return {
    ...freshState(),
    onboarded: true,
    pockets: [
      { id: 'a', name: 'Harian', color: '#FFF9D2', archived: false },
      { id: 'b', name: 'Tabungan', color: '#BFDDF0', archived: false },
    ],
    entries: [
      {
        id: 'seed',
        pocketId: 'a',
        kind: 'opening',
        amount: 1_000_000,
        name: 'Saldo awal',
        category: 'Saldo awal',
        note: '',
        at: new Date().toISOString(),
      },
    ],
  }
}
const plan = {
  pocketId: 'a',
  amount: 200_000,
  name: 'Sepatu',
  category: 'Belanja',
  need: 'want' as const,
  note: '',
}
describe('ledger invariants', () => {
  it('reserves without reducing total and releases on cancellation', () => {
    let s = defer(fixture(), plan)
    expect(balances(s)).toEqual({ total: 1_000_000, reserved: 200_000, available: 800_000 })
    s = resolve(s, s.plans[0].id, false)
    expect(balances(s).available).toBe(1_000_000)
  })
  it('enforces 24 hours and records exactly once', () => {
    const now = new Date('2026-10-01T00:00:00Z')
    let s = defer(fixture(), plan, now)
    const id = s.plans[0].id
    expect(() => resolve(s, id, true, new Date(now.getTime() + 86_399_999))).toThrow()
    s = resolve(s, id, true, new Date(now.getTime() + 86_400_000))
    expect(balances(s)).toEqual({ total: 800_000, reserved: 0, available: 800_000 })
    expect(() => resolve(s, id, true)).toThrow()
  })
  it('rejects overspending reserved funds without changing original', () => {
    const s = defer(fixture(), plan)
    expect(() =>
      addEntry(s, {
        pocketId: 'a',
        kind: 'expense',
        need: 'need',
        amount: 900_000,
        name: 'Sewa',
        category: 'Tagihan',
        note: '',
      }),
    ).toThrow()
    expect(s.entries).toHaveLength(1)
  })
  it('transfers preserve total', () => {
    const s = addEntry(fixture(), {
      pocketId: 'a',
      toPocketId: 'b',
      kind: 'transfer',
      amount: 100_000,
      name: 'Pindah',
      category: 'Transfer',
      note: '',
    })
    expect(balances(s).total).toBe(1_000_000)
    expect(balances(s, 'b').total).toBe(100_000)
  })
  it('rejects same-pocket transfers, immediate wants and fractional amounts', () => {
    const e = {
      pocketId: 'a',
      kind: 'expense' as const,
      need: 'want' as const,
      amount: 1,
      name: 'Tes',
      category: 'Belanja',
      note: '',
    }
    expect(() => addEntry(fixture(), e)).toThrow()
    expect(() => addEntry(fixture(), { ...e, kind: 'income', amount: 1.2 })).toThrow()
    expect(() => addEntry(fixture(), { ...e, kind: 'transfer', toPocketId: 'a' })).toThrow()
  })
  it('rejects deleting opening funds while reserved', () => {
    const s = defer(fixture(), plan)
    expect(() =>
      change(s, (d) => {
        d.entries = []
      }),
    ).toThrow()
  })
  it('rejects corrupted references and duplicate IDs', () => {
    const s = fixture()
    expect(() => validate({ ...s, entries: [...s.entries, { ...s.entries[0] }] })).toThrow()
    expect(() => validate({ ...s, entries: [{ ...s.entries[0], pocketId: 'missing' }] })).toThrow()
  })
  it('uses Monday through next Monday local time', () => {
    const { start, end } = weekRange(0, new Date(2026, 9, 25, 12))
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(19)
    expect(end.getDate()).toBe(26)
  })
})
