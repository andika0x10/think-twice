import { useState } from 'react'
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Clock3,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  SlidersHorizontal,
  Search,
  CircleHelp,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  balances,
  estimate,
  resolve,
  rupiah,
  weekRange,
  type Entry,
  type Pocket,
  type State,
} from '../core/model'
import { Empty, EntryRow, SectionTitle, WaitingBadge } from './primitives'
import type { Update } from './forms'
export type OpenSheet = (
  type: 'income' | 'expense' | 'transfer' | 'pocket' | 'edit',
  item?: Pocket | Entry,
) => void
export function PocketCard({
  state,
  pocket,
  onClick,
}: {
  state: State
  pocket: Pocket
  onClick: () => void
}) {
  const b = balances(state, pocket.id)
  return (
    <button className="pocket-card" style={{ background: pocket.color }} onClick={onClick}>
      <div className="pocket-card-top">
        <span className="pocket-stitch" />
        {pocket.target ? <Target size={18} /> : <ArrowUpRight size={18} />}
      </div>
      <h3>{pocket.name}</h3>
      <strong className="pocket-value" title={rupiah(b.available)} aria-label={rupiah(b.available)}>
        {b.available >= 100_000_000
          ? `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(b.available)}`
          : rupiah(b.available)}
      </strong>
      <small>{b.reserved > 0 ? `${rupiah(b.reserved)} dicadangkan` : 'Siap digunakan'}</small>
      {pocket.target && (
        <>
          <div className="progress-track">
            <span style={{ width: `${Math.min(100, (b.available / pocket.target) * 100)}%` }} />
          </div>
          <span className="target-copy">
            {Math.floor((b.available / pocket.target) * 100)}% dari {rupiah(pocket.target)}
          </span>
        </>
      )}
    </button>
  )
}
export function Home({
  state,
  open,
  go,
}: {
  state: State
  open: OpenSheet
  go: (page: string) => void
}) {
  const [today] = useState(() => new Date())
  const b = balances(state),
    waiting = state.plans.filter((p) => p.status === 'waiting'),
    entries = state.entries
      .filter((e) => e.kind !== 'opening')
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at))
  const { start, end } = weekRange()
  const spent = state.entries
    .filter((e) => new Date(e.at) >= start && new Date(e.at) < end && e.kind === 'expense')
    .reduce((s, e) => s + e.amount, 0)
  return (
    <>
      <div className="greeting">
        <span>
          {today.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
        <span className="offline-indicator">
          <span />
          Lokal & pribadi
        </span>
      </div>
      <section className="balance-hero">
        <div className="balance-copy">
          <span className="intro-label">Sedikit jeda, lebih bermakna.</span>
          <h1>
            Punya rencana.
            <br />
            Punya kendali.
          </h1>
          <div className="hero-amount">
            <span>Saldo tersedia</span>
            <strong>{rupiah(b.available)}</strong>
          </div>
        </div>
        <div className="hero-pocket" aria-hidden="true">
          <span className="coin coin-one">Rp</span>
          <span className="coin coin-two">✦</span>
          <div className="hero-pocket-back" />
          <div className="hero-pocket-front">
            <span>
              think
              <br />
              twice.
            </span>
            <span className="pocket-seam" />
          </div>
        </div>
        <div className="balance-foot">
          <div>
            <span>Saldo total</span>
            <strong>{rupiah(b.total)}</strong>
          </div>
          <div>
            <span>
              <Pause size={12} />
              Dicadangkan
            </span>
            <strong>{rupiah(b.reserved)}</strong>
          </div>
        </div>
      </section>
      <div className="quick-actions">
        <button className="primary" onClick={() => open('income')}>
          <ArrowDownLeft size={19} />
          Pemasukan
        </button>
        <button className="secondary" onClick={() => open('expense')}>
          <ArrowUpRight size={19} />
          Pengeluaran
        </button>
      </div>
      <SectionTitle title="Kantong kamu" action="Lihat semua" onAction={() => go('pockets')} />
      <div className="pocket-grid home-pockets">
        {state.pockets
          .filter((p) => !p.archived)
          .slice(0, 3)
          .map((p) => (
            <PocketCard state={state} pocket={p} key={p.id} onClick={() => open('pocket', p)} />
          ))}
      </div>
      <button className="pause-banner" onClick={() => go('waiting')}>
        <span className="pause-banner-icon">
          <Pause size={24} />
        </span>
        <span>
          <strong>
            {waiting.length
              ? `${waiting.length} keinginan sedang diberi waktu`
              : 'Tidak harus diputuskan sekarang.'}
          </strong>
          <small>
            {waiting.length
              ? 'Cek lagi setelah jeda. Masih ingin, atau sudah cukup?'
              : 'Beri keinginanmu jeda 24 jam sebelum membeli.'}
          </small>
        </span>
        <ChevronRight size={19} />
      </button>
      <SectionTitle title="Catatan terakhir" action="Riwayat" onAction={() => go('history')} />
      <div className="entry-list">
        {entries.length ? (
          entries
            .slice(0, 4)
            .map((e) => (
              <EntryRow key={e.id} entry={e} state={state} onClick={() => open('edit', e)} />
            ))
        ) : (
          <Empty title="Mulai dari satu catatan">Catat pemasukan atau pengeluaran pertamamu.</Empty>
        )}
      </div>
      <button className="review-banner" onClick={() => go('review')}>
        <span className="review-doodle">
          <Sparkles size={24} />
        </span>
        <span>
          <small>Ruang refleksi minggu ini</small>
          <strong>
            {spent ? `${rupiah(spent)} sudah digunakan.` : 'Kenali kebiasaan kecilmu.'}
          </strong>
          <span>Lihat review mingguan</span>
        </span>
        <ArrowUpRight size={23} />
      </button>
      <p className="home-footer">Keputusan kecil hari ini, ruang lebih lega nanti.</p>
    </>
  )
}
export function Pockets({ state, open }: { state: State; open: OpenSheet }) {
  const pockets = state.pockets.filter((p) => !p.archived)
  return (
    <>
      <div className="page-heading">
        <span className="intro-label">Ada tempat untuk setiap rencana</span>
        <h1>Kantong kamu</h1>
        <p>Pisahkan uangnya. Jernihkan tujuannya.</p>
      </div>
      <div className="page-actions">
        <button className="primary" onClick={() => open('pocket')}>
          <Plus size={18} />
          Kantong baru
        </button>
        <button className="secondary" onClick={() => open('transfer')}>
          <ArrowLeftRight size={18} />
          Transfer
        </button>
      </div>
      <div className="pocket-grid">
        {pockets.map((p) => (
          <PocketCard key={p.id} state={state} pocket={p} onClick={() => open('pocket', p)} />
        ))}
      </div>
      <SectionTitle title="Pelan-pelan, sampai tujuan" />
      {pockets.filter((p) => p.target).length ? (
        pockets
          .filter((p) => p.target)
          .map((p) => {
            const b = balances(state, p.id)
            return (
              <div key={p.id} className="goal-row">
                <span className="goal-icon" style={{ background: p.color }}>
                  <Target size={23} />
                </span>
                <div>
                  <h3>{p.name}</h3>
                  <p>{estimate(state, p)}</p>
                  <small>
                    {p.deadline
                      ? `Tujuan: ${new Date(p.deadline + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'Tanpa tenggat, tetap berjalan.'}
                  </small>
                  <div className="progress-track">
                    <span style={{ width: `${Math.min(100, (b.available / p.target!) * 100)}%` }} />
                  </div>
                  <small>
                    {rupiah(b.available)} / {rupiah(p.target!)}
                  </small>
                </div>
              </div>
            )
          })
      ) : (
        <Empty title="Apa yang sedang kamu tuju?">
          Buka kantong dan tambahkan target tabungan pertamamu.
        </Empty>
      )}
      {state.pockets.some((p) => p.archived) && (
        <details className="archived">
          <summary>Kantong diarsipkan</summary>
          {state.pockets
            .filter((p) => p.archived)
            .map((p) => (
              <p key={p.id}>{p.name} · Saldo nol</p>
            ))}
        </details>
      )}
    </>
  )
}
function remaining(readyAt: string, now: number) {
  const mins = Math.max(0, Math.ceil((Date.parse(readyAt) - now) / 60000))
  return mins === 0 ? 'Siap dipikirkan lagi' : `${Math.floor(mins / 60)}j ${mins % 60}m lagi`
}
export function Waiting({
  state,
  save,
  notify,
  now,
}: {
  state: State
  save: Update
  notify: (text: string) => void
  now: number
}) {
  const [filter, setFilter] = useState('waiting')
  const [busy, setBusy] = useState(false)
  const plans = state.plans
    .filter((p) => (filter === 'waiting' ? p.status === 'waiting' : p.status !== 'waiting'))
    .slice()
    .reverse()
  async function act(id: string, buy: boolean) {
    setBusy(true)
    try {
      await save(resolve(state, id, buy))
      notify(buy ? 'Pembelian dicatat. Semoga bermanfaat.' : 'Dana kembali tersedia di kantongmu.')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="intro-label">Ruang untuk berpikir dua kali</span>
        <h1>Beri waktu dulu.</h1>
        <p>Keinginan boleh menunggu. Keputusan ada padamu.</p>
      </div>
      <div className="waiting-summary">
        <span className="waiting-clock">
          <Clock3 size={33} />
        </span>
        <div>
          <small>Dana yang dicadangkan</small>
          <strong>{rupiah(balances(state).reserved)}</strong>
          <span>Masih milikmu. Belum dibelanjakan.</span>
        </div>
      </div>
      <div className="segmented page-tabs">
        <button
          onClick={() => setFilter('waiting')}
          className={filter === 'waiting' ? 'selected' : ''}
        >
          Sedang dijeda ({state.plans.filter((p) => p.status === 'waiting').length})
        </button>
        <button onClick={() => setFilter('done')} className={filter === 'done' ? 'selected' : ''}>
          Sudah diputuskan
        </button>
      </div>
      {plans.length ? (
        plans.map((p) => (
          <article className="waiting-card" key={p.id}>
            <div className="waiting-card-head">
              <WaitingBadge />
              <span className={Date.parse(p.readyAt) <= now ? 'ready-label' : ''}>
                {p.status === 'waiting'
                  ? remaining(p.readyAt, now)
                  : p.status === 'bought'
                    ? 'Dibeli'
                    : 'Dibatalkan'}
              </span>
            </div>
            <h2>{p.name}</h2>
            <strong className="waiting-price">{rupiah(p.amount)}</strong>
            <p>
              {state.pockets.find((k) => k.id === p.pocketId)?.name} · {p.category} ·{' '}
              {p.need === 'want' ? 'Keinginan' : 'Kebutuhan'}
            </p>
            {p.note && <p className="plan-note">{p.note}</p>}
            <small>
              Mulai{' '}
              {new Date(p.createdAt).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · Siap{' '}
              {new Date(p.readyAt).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
            {p.status === 'waiting' && (
              <div className="waiting-actions">
                <button className="secondary" disabled={busy} onClick={() => act(p.id, false)}>
                  <X size={16} />
                  Batalkan
                </button>
                <button
                  className="primary"
                  disabled={busy || Date.parse(p.readyAt) > now}
                  onClick={() => {
                    if (confirm(`Tetap ingin membeli ${p.name} seharga ${rupiah(p.amount)}?`))
                      void act(p.id, true)
                  }}
                >
                  <Check size={16} />
                  Beli
                </button>
              </div>
            )}
          </article>
        ))
      ) : (
        <Empty title={filter === 'waiting' ? 'Pikiran sedang lega.' : 'Belum ada keputusan.'}>
          {filter === 'waiting'
            ? 'Keinginan yang kamu catat akan menunggu di sini selama 24 jam.'
            : 'Pembelian yang dikonfirmasi atau dibatalkan akan tampil di sini.'}
        </Empty>
      )}
      <div className="gentle-note">
        <CircleHelp size={20} />
        <p>Jeda bukan larangan. Ini kesempatan untuk memastikan sesuatu memang berarti untukmu.</p>
      </div>
    </>
  )
}
export function History({ state, open }: { state: State; open: OpenSheet }) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [pocket, setPocket] = useState('all')
  const [category, setCategory] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filters, setFilters] = useState(false)
  const entries = state.entries
    .filter(
      (e) =>
        (kind === 'all' || e.kind === kind) &&
        (pocket === 'all' || e.pocketId === pocket || e.toPocketId === pocket) &&
        (category === 'all' || e.category === category) &&
        (!from || new Date(e.at) >= new Date(from + 'T00:00:00')) &&
        (!to || new Date(e.at) <= new Date(to + 'T23:59:59.999')) &&
        `${e.name} ${e.category} ${e.note}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
  return (
    <>
      <div className="page-heading">
        <span className="intro-label">Setiap catatan bercerita</span>
        <h1>Riwayat transaksi</h1>
        <p>Lihat kembali, pahami pelan-pelan.</p>
      </div>
      <div className="search-bar">
        <Search size={19} />
        <input
          aria-label="Cari transaksi"
          placeholder="Cari nama, kategori, atau catatan"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="icon-button"
          aria-label="Filter transaksi"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>
      {filters && (
        <div className="filter-grid">
          <label>
            Jenis
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Semua jenis</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
              <option value="transfer">Transfer</option>
              <option value="opening">Saldo awal</option>
            </select>
          </label>
          <label>
            Kantong
            <select value={pocket} onChange={(e) => setPocket(e.target.value)}>
              <option value="all">Semua kantong</option>
              {state.pockets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kategori
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Semua kategori</option>
              {[...new Set(state.entries.map((e) => e.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Dari tanggal
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Sampai tanggal
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button
            className="text-button"
            onClick={() => {
              setSearch('')
              setKind('all')
              setPocket('all')
              setCategory('all')
              setFrom('')
              setTo('')
            }}
          >
            Hapus filter
          </button>
        </div>
      )}
      <div className="history-count">{entries.length} catatan</div>
      <div className="entry-list">
        {entries.length ? (
          entries.map((e) => (
            <EntryRow entry={e} state={state} key={e.id} onClick={() => open('edit', e)} />
          ))
        ) : (
          <Empty title="Belum ada catatan yang cocok.">
            Coba ubah pencarian atau filter transaksi.
          </Empty>
        )}
      </div>
    </>
  )
}
export function Review({ state }: { state: State }) {
  const [offset, setOffset] = useState(0)
  const { start, end } = weekRange(offset)
  const last = new Date(end.getTime() - 1)
  const entries = state.entries.filter((e) => new Date(e.at) >= start && new Date(e.at) < end),
    expenses = entries.filter((e) => e.kind === 'expense'),
    income = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0),
    spent = expenses.reduce((s, e) => s + e.amount, 0),
    need = expenses.filter((e) => e.need === 'need').reduce((s, e) => s + e.amount, 0)
  const cats = Object.entries(
    expenses.reduce<Record<string, number>>(
      (s, e) => ({ ...s, [e.category]: (s[e.category] ?? 0) + e.amount }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1])
  const plans = state.plans.filter(
    (p) => p.resolvedAt && new Date(p.resolvedAt) >= start && new Date(p.resolvedAt) < end,
  )
  return (
    <>
      <div className="page-heading">
        <span className="intro-label">Bukan menghakimi. Memahami.</span>
        <h1>
          Seminggu,
          <br />
          sedikit lebih sadar.
        </h1>
        <p>Luangkan satu menit untuk melihat kebiasaanmu.</p>
      </div>
      <div className="week-selector">
        <button
          className="icon-button"
          aria-label="Minggu sebelumnya"
          onClick={() => setOffset(offset - 1)}
        >
          <ChevronLeft />
        </button>
        <strong>
          {start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} –{' '}
          {last.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </strong>
        <button
          className="icon-button"
          aria-label="Minggu berikutnya"
          disabled={offset === 0}
          onClick={() => setOffset(offset + 1)}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="review-totals">
        <div>
          <ArrowDownLeft size={20} />
          <span>Pemasukan</span>
          <strong>{rupiah(income)}</strong>
        </div>
        <div>
          <ArrowUpRight size={20} />
          <span>Pengeluaran</span>
          <strong>{rupiah(spent)}</strong>
        </div>
      </div>
      <SectionTitle title="Untuk apa minggu ini?" />
      {spent > 0 ? (
        <>
          <div
            className="spend-bar"
            aria-label={`Kebutuhan ${Math.round((need / spent) * 100)} persen, keinginan ${Math.round(((spent - need) / spent) * 100)} persen`}
          >
            <span style={{ width: `${(need / spent) * 100}%` }} />
            <span style={{ width: `${((spent - need) / spent) * 100}%` }} />
          </div>
          <div className="spend-legend">
            <span>
              <i />
              Kebutuhan<strong>{rupiah(need)}</strong>
            </span>
            <span>
              <i />
              Keinginan<strong>{rupiah(spent - need)}</strong>
            </span>
          </div>
          <div className="category-list">
            {cats.map(([name, amount], i) => (
              <div key={name}>
                <span>{name}</span>
                <div>
                  <span
                    style={{
                      width: `${(amount / spent) * 100}%`,
                      background: ['#8CC0EB', '#BFDDF0', '#FFEBCC', '#FFF9D2'][i % 4],
                    }}
                  />
                </div>
                <strong>{rupiah(amount)}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty title="Minggu ini masih terbuka.">
          Pengeluaran yang tercatat akan membantu kamu mengenali polanya.
        </Empty>
      )}
      <div className="reflection">
        <Pause size={26} />
        <h2>Jeda kecilmu minggu ini.</h2>
        <div>
          <span>
            <strong>{plans.filter((p) => p.status === 'bought').length}</strong>Dibeli setelah jeda
          </span>
          <span>
            <strong>{plans.filter((p) => p.status === 'cancelled').length}</strong>Pembelian
            dibatalkan
          </span>
        </div>
        <p>Apa satu keputusan yang membuatmu merasa lebih tenang minggu ini?</p>
      </div>
    </>
  )
}
