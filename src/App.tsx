import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  Home as HomeIcon,
  Wallet,
  Clock3,
  History as HistoryIcon,
  Settings as SettingsIcon,
  ArrowLeft,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { animate, bounceCoins, motion } from './ui/motion'
import { freshState, type Entry, type Pocket, type State } from './core/model'
import { createRepository, type Repository } from './data/repository'
import { clearLock, getLock } from './platform/security'
import { syncNotifications } from './platform/notifications'
import { Brand, Modal } from './ui/primitives'
import { Onboarding, PocketForm, TransactionForm } from './ui/forms'
import { Home, Pockets, Waiting, History, Review, type OpenSheet } from './ui/pages'
import { BackupForm, LockScreen, PinForm, Settings } from './ui/settings'
import './App.css'
type Sheet = {
  type: 'income' | 'expense' | 'transfer' | 'pocket' | 'edit' | 'backup' | 'restore' | 'pin'
  item?: Pocket | Entry
}
const nav = [
  { id: 'home', label: 'Beranda', icon: HomeIcon },
  { id: 'pockets', label: 'Kantong', icon: Wallet },
  { id: 'waiting', label: 'Daftar Tunggu', icon: Clock3 },
  { id: 'history', label: 'Riwayat', icon: HistoryIcon },
]
function App() {
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState('home')
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [closingSheet, setClosingSheet] = useState(false)
  const savedSheet = useRef(false)
  const [celebration, setCelebration] = useState(0)
  const consumedCelebration = useRef(0)
  const shell = useRef<HTMLDivElement>(null)
  const toastElement = useRef<HTMLDivElement>(null)
  const previousPage = useRef(page)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(false)
  const [hasLock, setHasLock] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [privateScreen, setPrivateScreen] = useState(false)
  const repo = useRef<Repository | null>(null)
  const saving = useRef(false)
  const content = useRef<HTMLElement>(null)
  const hiddenAt = useRef(0)
  const hasLockRef = useRef(false)
  const pageRef = useRef(page)
  const sheetRef = useRef(sheet)
  useEffect(() => {
    pageRef.current = page
    sheetRef.current = sheet
  }, [page, sheet])
  const notify = useCallback((text: string) => setToast(text), [])
  const refreshLock = useCallback(async () => {
    const lock = await getLock()
    setHasLock(!!lock)
    hasLockRef.current = !!lock
  }, [])
  useEffect(() => {
    let active = true
    async function init() {
      try {
        const r = await createRepository()
        const [s, lock] = await Promise.all([r.load(), getLock()])
        if (!active) return
        repo.current = r
        setState(s)
        setLocked(!!lock)
        setHasLock(!!lock)
        hasLockRef.current = !!lock
        syncNotifications(s).catch(() =>
          notify('Pengingat belum dapat dijadwalkan. Periksa izin di Pengaturan.'),
        )
      } catch (e) {
        if (active) setError((e as Error).message)
      }
    }
    void init()
    return () => {
      active = false
    }
  }, [notify])
  const save = useCallback(
    async (next: State) => {
      if (saving.current) throw new Error('Tunggu penyimpanan sebelumnya selesai.')
      if (!repo.current) throw new Error('Penyimpanan belum siap.')
      saving.current = true
      setBusy(true)
      try {
        await repo.current.save(next)
        setState(next)
        try {
          await syncNotifications(next)
        } catch {
          notify('Data tersimpan. Pengingat belum dapat dijadwalkan.')
        }
      } finally {
        saving.current = false
        setBusy(false)
      }
    },
    [notify],
  )
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 5500)
    return () => clearTimeout(timer)
  }, [toast])
  const ready = !!state?.onboarded && !locked && !error
  useLayoutEffect(() => {
    const root = shell.current
    const target = content.current
    if (!ready || !root || !target) return
    const before = previousPage.current
    previousPage.current = page
    const order = [...nav.map((item) => item.id), 'review', 'settings']
    const direction = order.indexOf(page) >= order.indexOf(before) ? 1 : -1
    return animate(root, (timeline) => {
      timeline.fromTo(
        target,
        { x: direction * 12, opacity: 0.65 },
        {
          x: 0,
          opacity: 1,
          duration: motion.navigate,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        },
      )
      const icon = root.querySelector('.bottom-nav .active svg')
      if (icon)
        timeline.from(
          icon,
          {
            y: -5,
            scale: 1.15,
            duration: motion.feedback,
            ease: motion.settle,
            clearProps: 'transform',
          },
          0,
        )
    })
  }, [page, ready])
  useLayoutEffect(() => {
    if (celebration === consumedCelebration.current) return
    consumedCelebration.current = celebration
    if (!ready || page !== 'home' || !content.current) return
    return bounceCoins(content.current)
  }, [celebration, ready, page])
  useLayoutEffect(() => {
    if (!toast || !toastElement.current) return
    return animate(toastElement.current, (timeline) => {
      timeline.from(toastElement.current, {
        y: 10,
        scale: 0.95,
        opacity: 0,
        duration: motion.sheetOpen,
        ease: motion.settle,
        clearProps: 'transform,opacity',
      })
    })
  }, [toast])
  const dismissSheet = useCallback(() => {
    if (!saving.current) setClosingSheet(true)
  }, [])
  useEffect(() => {
    const handles: Promise<{ remove: () => Promise<void> }>[] = []
    const handleState = (active: boolean) => {
      if (!active) {
        hiddenAt.current = Date.now()
        if (hasLockRef.current) setPrivateScreen(true)
      } else {
        setNow(Date.now())
        if (hiddenAt.current && Date.now() - hiddenAt.current >= 30000 && hasLockRef.current) {
          setLocked(true)
          setSheet(null)
        }
        setPrivateScreen(false)
      }
    }
    if (Capacitor.isNativePlatform()) {
      handles.push(NativeApp.addListener('appStateChange', ({ isActive }) => handleState(isActive)))
      handles.push(
        NativeApp.addListener('backButton', () => {
          if (sheetRef.current) dismissSheet()
          else if (pageRef.current !== 'home') setPage('home')
          else void NativeApp.exitApp()
        }),
      )
      handles.push(
        LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          setPage(event.notification.extra?.page === 'review' ? 'review' : 'waiting')
        }),
      )
    }
    const visibility = () => {
      if (!Capacitor.isNativePlatform()) handleState(!document.hidden)
    }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      handles.forEach((h) => {
        void h.then((x) => x.remove())
      })
    }
  }, [dismissSheet])
  const go = (p: string) => {
    if (p === page) return
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const openSheet = (next: Sheet) => {
    savedSheet.current = false
    setClosingSheet(false)
    setSheet(next)
  }
  const open: OpenSheet = (type, item) => openSheet({ type, item })
  const done = () => {
    savedSheet.current = true
    setClosingSheet(true)
  }
  async function reset() {
    await save(freshState())
    await clearLock()
    await refreshLock()
    setLocked(false)
    setSheet(null)
    setPage('home')
  }
  if (error)
    return (
      <main className="fatal">
        <ShieldCheck size={40} />
        <h1>Data belum bisa dibuka.</h1>
        <p>{error}</p>
        <button className="primary" onClick={() => location.reload()}>
          Coba lagi
        </button>
        <p>Data tidak dihapus. Coba tutup dan buka kembali aplikasi.</p>
      </main>
    )
  if (!state)
    return (
      <main className="loading">
        <Brand />
        <LoaderCircle className="spinner" />
        <p>Menyiapkan ruang untuk uangmu…</p>
      </main>
    )
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} onReset={reset} />
  const modal = sheet && (
    <Modal
      closing={closingSheet}
      obscured={privateScreen}
      onExited={() => {
        setSheet(null)
        setClosingSheet(false)
        if (savedSheet.current) {
          savedSheet.current = false
          notify('Tersimpan. Satu langkah lebih terarah.')
          if (page === 'home' && ['income', 'expense', 'transfer', 'edit'].includes(sheet.type))
            setCelebration((value) => value + 1)
        }
      }}
      title={
        {
          income: 'Catat pemasukan',
          expense: 'Catat pengeluaran',
          transfer: 'Transfer antarkantong',
          pocket: sheet.item ? 'Kelola kantong' : 'Kantong baru',
          edit: 'Detail transaksi',
          backup: 'Backup data',
          restore: 'Pulihkan backup',
          pin: 'Kunci aplikasi',
        }[sheet.type]
      }
      onClose={dismissSheet}
    >
      {sheet.type === 'pocket' ? (
        <PocketForm
          state={state}
          save={save}
          done={done}
          pocket={sheet.item as Pocket | undefined}
        />
      ) : sheet.type === 'backup' || sheet.type === 'restore' ? (
        <BackupForm
          mode={sheet.type}
          state={state}
          save={save}
          done={done}
          onLockChange={refreshLock}
        />
      ) : sheet.type === 'pin' ? (
        <PinForm done={done} onLockChange={refreshLock} />
      ) : (
        <TransactionForm
          state={state}
          mode={sheet.type}
          save={save}
          done={done}
          entry={sheet.item as Entry | undefined}
        />
      )}
    </Modal>
  )
  return (
    <>
      {!state.onboarded ? (
        <Onboarding save={save} onRestore={() => openSheet({ type: 'restore' })} busy={busy} />
      ) : (
        <div ref={shell} className="app-shell">
          <header className="app-header">
            <div className="header-inner">
              {page === 'settings' || page === 'review' ? (
                <button
                  className="icon-button"
                  aria-label="Kembali ke beranda"
                  onClick={() => go('home')}
                >
                  <ArrowLeft size={22} />
                </button>
              ) : (
                <Brand small />
              )}
              <div className="desktop-nav">
                {nav.map((n) => (
                  <button
                    className={page === n.id ? 'active' : ''}
                    key={n.id}
                    onClick={() => go(n.id)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <button
                className={`icon-button ${page === 'settings' ? 'active' : ''}`}
                aria-label="Pengaturan"
                onClick={() => go('settings')}
              >
                <SettingsIcon size={22} />
              </button>
            </div>
          </header>
          <main ref={content} className={`main-content page-${page}`}>
            {page === 'home' ? (
              <Home state={state} open={open} go={go} />
            ) : page === 'pockets' ? (
              <Pockets state={state} open={open} />
            ) : page === 'waiting' ? (
              <Waiting state={state} save={save} notify={notify} now={now} />
            ) : page === 'history' ? (
              <History state={state} open={open} />
            ) : page === 'review' ? (
              <Review state={state} />
            ) : (
              <Settings
                state={state}
                save={save}
                open={(type) => openSheet({ type })}
                hasLock={hasLock}
                notify={notify}
              />
            )}
          </main>
          <nav className="bottom-nav" aria-label="Navigasi utama">
            {nav.map((n) => (
              <button
                aria-current={page === n.id ? 'page' : undefined}
                className={page === n.id ? 'active' : ''}
                key={n.id}
                onClick={() => go(n.id)}
              >
                <span>
                  <n.icon size={22} />
                  {n.id === 'waiting' && state.plans.some((p) => p.status === 'waiting') && <i />}
                </span>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {modal}
      {toast && (
        <div ref={toastElement} className="toast" role="status">
          {toast}
          <button onClick={() => setToast('')} aria-label="Tutup pemberitahuan">
            ×
          </button>
        </div>
      )}
      {privateScreen && (
        <div className="privacy-overlay">
          <Brand />
          <ShieldCheck size={40} />
        </div>
      )}
    </>
  )
}
export default App
