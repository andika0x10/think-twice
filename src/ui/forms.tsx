import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { animate, motion } from './motion'
import { ArrowRight, ShieldCheck, Pause } from 'lucide-react'
import {
  addEntry,
  assertAmount,
  balances,
  categories,
  change,
  colors,
  defer,
  freshState,
  rupiah,
  uid,
  type Entry,
  type Pocket,
  type State,
} from '../core/model'
import { Brand } from './primitives'
export type Update = (next: State) => Promise<void>
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null
}
export function MoneyInput({
  name = 'amount',
  label = 'Nominal',
  defaultValue,
  required = true,
}: {
  name?: string
  label?: string
  defaultValue?: number
  required?: boolean
}) {
  return (
    <label>
      {label}
      <span className="money-input">
        <span>Rp</span>
        <input
          name={name}
          aria-label={label}
          type="number"
          inputMode="numeric"
          min={required ? 1 : 0}
          max={1_000_000_000_000}
          step="1"
          required={required}
          defaultValue={defaultValue}
          placeholder="0"
        />
      </span>
    </label>
  )
}
export function PocketSelect({
  state,
  name = 'pocketId',
  label = 'Dari kantong',
  value,
}: {
  state: State
  name?: string
  label?: string
  value?: string
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value}>
        {state.pockets
          .filter((p) => !p.archived || p.id === value)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {rupiah(balances(state, p.id).available)}
            </option>
          ))}
      </select>
    </label>
  )
}
export function Onboarding({
  save,
  onRestore,
  busy,
}: {
  save: Update
  onRestore: () => void
  busy: boolean
}) {
  const art = useRef<HTMLDivElement>(null)
  useLayoutEffect(
    () =>
      animate(art.current!, (timeline) => {
        timeline.from(art.current, {
          y: 16,
          scale: 0.9,
          duration: motion.enter,
          ease: motion.settle,
          clearProps: 'transform',
        })
      }),
    [],
  )
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const data = new FormData(event.currentTarget)
      const total = Number(data.get('total'))
      if (!Number.isSafeInteger(total) || total < 0)
        throw new Error('Saldo awal harus berupa Rupiah bulat, minimal nol.')
      const state = freshState()
      state.onboarded = true
      for (let i = 0; i < 3; i++) {
        const amount = Number(data.get(`allocation${i}`))
        if (!Number.isSafeInteger(amount) || amount < 0)
          throw new Error('Alokasi harus berupa Rupiah bulat, minimal nol.')
        const id = uid()
        state.pockets.push({
          id,
          name: String(data.get(`name${i}`)).trim(),
          color: colors[i],
          archived: false,
        })
        if (amount > 0)
          state.entries.push({
            id: uid(),
            pocketId: id,
            kind: 'opening',
            amount,
            name: 'Saldo awal',
            category: 'Saldo awal',
            note: '',
            at: new Date().toISOString(),
          })
      }
      if (balances(state).total !== total)
        throw new Error('Jumlah pembagian kantong harus sama dengan saldo awal.')
      await save(state)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <main className="onboarding">
      <Brand />
      <div ref={art} className="onboarding-art" aria-hidden="true">
        <div className="little-coin">Rp</div>
        <div className="pocket-art">
          <span>
            Untuk hari ini.
            <br />
            Untuk nanti.
          </span>
        </div>
      </div>
      <span className="intro-label">Langkah kecil, lebih terarah</span>
      <h1>
        Uangmu punya
        <br />
        tempatnya.
      </h1>
      <p className="intro-copy">
        Mulai dari yang kamu punya. Bagi ke kantong, lalu beri ruang untuk berpikir.
      </p>
      <form onSubmit={submit}>
        <MoneyInput name="total" label="Saldo awal kamu" required={false} />
        <div className="allocation-title">
          <h2>Bagi ke kantong</h2>
          <span>Bisa diubah nanti</span>
        </div>
        {['Harian', 'Keinginan', 'Tabungan'].map((name, i) => (
          <div className="allocation" key={name}>
            <span className="pocket-mini" style={{ background: colors[i] }} />
            <label className="sr-only" htmlFor={`name${i}`}>
              Nama kantong {i + 1}
            </label>
            <input
              id={`name${i}`}
              name={`name${i}`}
              aria-label={`Nama kantong ${i + 1}`}
              defaultValue={name}
              maxLength={40}
              required
            />
            <label className="sr-only" htmlFor={`allocation${i}`}>
              Alokasi {name}
            </label>
            <input
              id={`allocation${i}`}
              name={`allocation${i}`}
              aria-label={`Alokasi ${name}`}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="Rp 0"
              defaultValue={0}
              required
            />
          </div>
        ))}
        <ErrorText message={error} />
        <button className="primary wide" disabled={busy}>
          Mulai lebih sadar
          <ArrowRight size={18} />
        </button>
      </form>
      <button className="text-button restore-link" onClick={onRestore}>
        Sudah punya backup? Pulihkan data
      </button>
      <p className="privacy-note">
        <ShieldCheck size={15} />
        Data tersimpan di perangkatmu.
      </p>
    </main>
  )
}
export function TransactionForm({
  state,
  mode,
  save,
  done,
  entry,
}: {
  state: State
  mode: 'income' | 'expense' | 'transfer' | 'edit'
  save: Update
  done: () => void
  entry?: Entry
}) {
  const [need, setNeed] = useState(entry?.need ?? 'need')
  const [delay, setDelay] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const kind = mode === 'edit' ? entry!.kind : mode
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const f = new FormData(event.currentTarget)
      const amount = Number(f.get('amount'))
      assertAmount(amount)
      const values = {
        pocketId: String(f.get('pocketId')),
        amount,
        name: String(f.get('name')).trim(),
        category: String(f.get('category') ?? 'Transfer'),
        note: String(f.get('note') ?? ''),
        kind,
        need: kind === 'expense' ? need : undefined,
        toPocketId: kind === 'transfer' ? String(f.get('toPocketId')) : undefined,
      }
      let next: State
      if (mode === 'edit') {
        if (kind === 'expense' && need === 'want' && !entry!.planId) {
          throw new Error(
            'Keinginan wajib dijeda. Hapus transaksi ini lalu buat pengeluaran baru sebagai keinginan.',
          )
        }
        next = change(state, (s) => {
          const e = s.entries.find((e) => e.id === entry!.id)!
          if (e.planId) {
            const p = s.plans.find((p) => p.id === e.planId)!
            p.amount = amount
            p.pocketId = values.pocketId
            p.name = values.name
            p.category = values.category
            p.note = values.note
            p.need = need
          }
          Object.assign(e, values)
        })
      } else if (kind === 'expense' && (need === 'want' || delay)) {
        next = defer(state, { ...values, need })
      } else {
        next = addEntry(state, values)
      }
      await save(next)
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!confirm('Hapus transaksi ini? Saldo akan dihitung ulang.')) return
    setBusy(true)
    try {
      await save(
        change(state, (s) => {
          s.entries = s.entries.filter((e) => e.id !== entry!.id)
          if (entry!.planId) {
            const p = s.plans.find((p) => p.id === entry!.planId)!
            p.status = 'cancelled'
            p.resolvedAt = new Date().toISOString()
          }
        }),
      )
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      <MoneyInput defaultValue={entry?.amount} />
      <label>
        Nama transaksi
        <input
          name="name"
          required
          maxLength={100}
          placeholder={
            kind === 'income'
              ? 'Misalnya, gaji bulan ini'
              : kind === 'transfer'
                ? 'Misalnya, isi tabungan'
                : 'Misalnya, makan siang'
          }
          defaultValue={entry?.name}
        />
      </label>
      <PocketSelect
        state={state}
        value={entry?.pocketId}
        label={kind === 'income' ? 'Masuk ke kantong' : 'Dari kantong'}
      />
      {kind === 'transfer' ? (
        <PocketSelect
          state={state}
          name="toPocketId"
          label="Ke kantong"
          value={entry?.toPocketId ?? state.pockets.filter((p) => !p.archived)[1]?.id}
        />
      ) : (
        <label>
          Kategori
          <select
            name="category"
            defaultValue={entry?.category ?? (kind === 'income' ? 'Gaji' : 'Makanan')}
          >
            {[...new Set([...categories, ...(entry ? [entry.category] : [])])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {kind === 'expense' && (
        <>
          <fieldset>
            <legend>Ini termasuk…</legend>
            <div className="segmented">
              <button
                type="button"
                className={need === 'need' ? 'selected' : ''}
                onClick={() => setNeed('need')}
              >
                Kebutuhan
              </button>
              <button
                type="button"
                className={need === 'want' ? 'selected' : ''}
                onClick={() => setNeed('want')}
              >
                Keinginan
              </button>
            </div>
          </fieldset>
          {mode !== 'edit' &&
            (need === 'want' ? (
              <div className="info-box">
                <Pause size={20} />
                <p>Berikan waktu 24 jam. Dananya dicadangkan, keputusan tetap di tanganmu.</p>
              </div>
            ) : (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={delay}
                  onChange={(e) => setDelay(e.target.checked)}
                />
                Jeda dulu selama 24 jam
              </label>
            ))}
        </>
      )}
      <label>
        Catatan <span className="muted">(opsional)</span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          placeholder="Ada yang ingin diingat?"
          defaultValue={entry?.note}
        />
      </label>
      <ErrorText message={error} />
      <button className="primary wide" disabled={busy}>
        {mode === 'edit'
          ? 'Simpan perubahan'
          : kind === 'expense' && (need === 'want' || delay)
            ? 'Jeda & cadangkan dana'
            : kind === 'transfer'
              ? 'Pindahkan dana'
              : 'Simpan transaksi'}
      </button>
      {mode === 'edit' && (
        <button type="button" className="danger-button" disabled={busy} onClick={remove}>
          Hapus transaksi
        </button>
      )}
    </form>
  )
}
export function PocketForm({
  state,
  save,
  done,
  pocket,
}: {
  state: State
  save: Update
  done: () => void
  pocket?: Pocket
}) {
  const [color, setColor] = useState(pocket?.color ?? colors[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const f = new FormData(event.currentTarget)
      const target = f.get('target') ? Number(f.get('target')) : undefined
      const value: Pocket = {
        id: pocket?.id ?? uid(),
        name: String(f.get('name')).trim(),
        color,
        archived: false,
        target,
        deadline: String(f.get('deadline') || '') || undefined,
      }
      await save(
        change(state, (s) => {
          if (pocket) s.pockets[s.pockets.findIndex((p) => p.id === pocket.id)] = value
          else s.pockets.push(value)
        }),
      )
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function archive() {
    if (!confirm('Arsipkan kantong ini? Riwayat transaksi tetap tersimpan.')) return
    setBusy(true)
    try {
      await save(
        change(state, (s) => {
          s.pockets.find((p) => p.id === pocket!.id)!.archived = true
        }),
      )
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>
        Nama kantong
        <input
          name="name"
          maxLength={40}
          required
          placeholder="Misalnya, Dana darurat"
          defaultValue={pocket?.name}
        />
      </label>
      <fieldset>
        <legend>Warna kantong</legend>
        <div className="color-options">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Warna ${c}`}
              aria-pressed={color === c}
              className={color === c ? 'chosen' : ''}
              style={{ background: c }}
              onClick={() => setColor(c)}
            >
              {color === c ? '✓' : ''}
            </button>
          ))}
        </div>
      </fieldset>
      <MoneyInput
        name="target"
        label="Target tabungan (opsional)"
        defaultValue={pocket?.target}
        required={false}
      />
      <label>
        Tanggal tujuan <span className="muted">(opsional)</span>
        <input name="deadline" type="date" defaultValue={pocket?.deadline} />
      </label>
      <ErrorText message={error} />
      <button className="primary wide" disabled={busy}>
        Simpan kantong
      </button>
      {pocket && (
        <button type="button" className="danger-button" disabled={busy} onClick={archive}>
          Arsipkan kantong
        </button>
      )}
    </form>
  )
}
