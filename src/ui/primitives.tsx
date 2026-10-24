import { useLayoutEffect, useId, useRef, type ReactNode } from 'react'
import { animate, motion } from './motion'
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
  closing,
  obscured,
  onExited,
  children,
}: {
  title: string
  closing: boolean
  obscured: boolean
  onExited: () => void
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const exited = useRef(onExited)
  useLayoutEffect(() => {
    exited.current = onExited
  }, [onExited])
  useLayoutEffect(() => {
    const dialog = ref.current!
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  useLayoutEffect(() => {
    const dialog = ref.current!
    // Disabling the form can blur its submit button. Keep focus in the dialog
    // until the native close restores the original trigger.
    if (
      closing &&
      (!dialog.contains(document.activeElement) || document.activeElement?.matches(':disabled'))
    )
      dialog.querySelector<HTMLButtonElement>('button[aria-label="Tutup"]')?.focus()
    const distance = matchMedia('(max-width: 650px)').matches ? 48 : 16
    return animate(
      dialog,
      (timeline) => {
        if (closing)
          timeline.to(dialog, {
            y: distance,
            opacity: 0,
            duration: motion.sheetClose,
            ease: 'power2.in',
          })
        else
          timeline.fromTo(
            dialog,
            { y: distance, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: motion.sheetOpen,
              ease: motion.settle,
              clearProps: 'transform,opacity',
            },
          )
      },
      closing ? () => exited.current() : undefined,
    )
  }, [closing])
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      data-closing={closing || undefined}
      data-private={obscured || undefined}
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
      <fieldset className="sheet-content" disabled={closing}>
        {children}
      </fieldset>
    </dialog>
  )
}

export function Progress({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)
  const percent = Math.max(0, Math.min(100, value))
  useLayoutEffect(() => {
    const bar = ref.current!
    bar.style.width = `${percent}%`
    let cleanup = () => {}
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      cleanup = animate(bar, (timeline) => {
        timeline.fromTo(
          bar,
          { width: `${previous.current}%` },
          {
            width: `${percent}%`,
            duration: motion.progress,
            ease: 'power2.out',
          },
        )
      })
      previous.current = percent
    })
    observer.observe(bar.parentElement!)
    return () => {
      observer.disconnect()
      cleanup()
    }
  }, [percent])
  return (
    <div className="progress-track">
      <span ref={ref} style={{ width: `${percent}%` }} />
    </div>
  )
}
