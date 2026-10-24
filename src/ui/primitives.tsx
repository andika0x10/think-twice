import { useEffect, useId, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import {
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Pause,
  ChevronRight,
} from 'lucide-react'
import { rupiah, type Entry, type State } from '../core/model'
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'small' : ''}`}>
      <span className="brand-symbol">
        <span />
        <span />
      </span>
      <span>
        think twice<span className="brand-dot">.</span>
      </span>
    </div>
  )
}
export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Wallet size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}
export function EntryRow({
  entry,
  state,
  onClick,
}: {
  entry: Entry
  state: State
  onClick?: () => void
}) {
  const income = entry.kind === 'income' || entry.kind === 'opening'
  const Icon = entry.kind === 'transfer' ? ArrowLeftRight : income ? ArrowDownLeft : ArrowUpRight
  return (
    <button className="entry-row" onClick={onClick}>
      <span className={`entry-icon ${income ? 'income' : ''}`}>
        <Icon size={20} />
      </span>
      <span className="entry-info">
        <strong>{entry.name}</strong>
        <small>
          {state.pockets.find((p) => p.id === entry.pocketId)?.name} · {entry.category}
        </small>
      </span>
      <span className="entry-amount">
        <strong>
          {income ? '+' : entry.kind === 'transfer' ? '' : '−'}
          {rupiah(entry.amount)}
        </strong>
        <small>
          {new Date(entry.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </small>
      </span>
    </button>
  )
}
export function WaitingBadge() {
  return (
    <span className="badge">
      <Pause size={12} />
      Jeda 24 jam
    </span>
  )
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      gsap.fromTo(
        dialog,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' },
      )
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose()
        }
      }}
    >
      <div className="sheet-handle" />
      <header className="sheet-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" aria-label="Tutup" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  )
}
