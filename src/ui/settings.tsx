import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  Download,
  Upload,
  FileSpreadsheet,
  Fingerprint,
  LockKeyhole,
  Bell,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import { change, type State } from '../core/model'
import { encryptBackup, decryptBackup, csv } from '../platform/backup'
import { saveFile, openFile } from '../platform/files'
import {
  biometricAvailable,
  biometricErrorMessage,
  clearLock,
  getLock,
  setPin,
  checkPin,
  unlockBiometric,
  type LockConfig,
} from '../platform/security'
import { requestNotifications } from '../platform/notifications'
import { ErrorText, type Update } from './forms'
import { Brand } from './primitives'
export function BackupForm({
  mode,
  state,
  save,
  done,
  onLockChange,
}: {
  mode: 'backup' | 'restore'
  state: State
  save: Update
  done: () => void
  onLockChange: () => Promise<void>
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const password = String(f.get('password'))
      if (mode === 'backup') {
        if (password !== f.get('confirm')) throw new Error('Konfirmasi password tidak cocok.')
        await saveFile(
          `think-twice-${new Date().toISOString().slice(0, 10)}.thinktwice`,
          await encryptBackup(state, password),
          'application/octet-stream',
        )
      } else {
        const restored = await decryptBackup(await openFile(), password)
        if (
          !confirm(
            `Pulihkan ${restored.pockets.length} kantong dan ${restored.entries.length} transaksi? Data saat ini akan diganti.`,
          )
        )
          return
        await save(restored)
        await clearLock()
        await onLockChange()
      }
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <p className="muted">
        {mode === 'backup'
          ? 'Simpan salinan semua kantong, transaksi, dan daftar tunggu. Simpan file ini di tempat lain agar aman jika HP hilang.'
          : 'Masukkan password backup, lalu pilih file .thinktwice. Data diperiksa sebelum dipulihkan.'}
      </p>
      <label>
        Password backup
        <input
          name="password"
          type="password"
          minLength={mode === 'backup' ? 8 : 1}
          required
          autoComplete={mode === 'backup' ? 'new-password' : 'current-password'}
        />
      </label>
      {mode === 'backup' && (
        <>
          <label>
            Ulangi password
            <input name="confirm" type="password" required autoComplete="new-password" />
          </label>
          <div className="info-box">
            <ShieldCheck size={21} />
            <p>
              Ingat password ini. Backup tidak bisa dibuka jika password terlupa. PIN aplikasi tidak
              disertakan.
            </p>
          </div>
        </>
      )}
      <ErrorText message={error} />
      <button className="primary wide" disabled={busy}>
        {busy
          ? 'Memproses…'
          : mode === 'backup'
            ? 'Simpan backup terenkripsi'
            : 'Pilih & pulihkan backup'}
      </button>
    </form>
  )
}
export function PinForm({
  done,
  onLockChange,
}: {
  done: () => void
  onLockChange: () => Promise<void>
}) {
  const [existing, setExisting] = useState<LockConfig | null>(null)
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    getLock()
      .then(setExisting)
      .catch((e) => setError(e.message))
    biometricAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false))
  }, [])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(e.currentTarget)
    try {
      if (existing) await checkPin(String(f.get('old')))
      const pin = String(f.get('pin'))
      if (pin !== f.get('confirm')) throw new Error('Konfirmasi PIN tidak cocok.')
      await setPin(pin, f.get('biometric') === 'on')
      await onLockChange()
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function disable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    try {
      const f = new FormData(e.currentTarget)
      await checkPin(String(f.get('old')))
      await clearLock()
      await onLockChange()
      done()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="stack">
      <form className="stack" onSubmit={submit}>
        {existing && (
          <label>
            PIN saat ini
            <input
              name="old"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="off"
            />
          </label>
        )}
        <label>
          PIN baru (6 digit)
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="new-password"
          />
        </label>
        <label>
          Ulangi PIN
          <input
            name="confirm"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="check-row">
          <input
            name="biometric"
            type="checkbox"
            disabled={!available}
            defaultChecked={existing?.biometric && available}
          />
          Gunakan biometrik {!available && '(tidak tersedia)'}
        </label>
        {!Capacitor.isNativePlatform() && (
          <p className="muted">
            Kunci browser hanya untuk pengembangan. Perlindungan Keystore tersedia di Android.
          </p>
        )}
        <ErrorText message={error} />
        <button className="primary wide" disabled={busy}>
          Simpan kunci aplikasi
        </button>
      </form>
      {existing && (
        <form className="stack" onSubmit={disable}>
          <hr />
          <label>
            PIN untuk menonaktifkan
            <input
              name="old"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="off"
            />
          </label>
          <button className="danger-button" disabled={busy}>
            Nonaktifkan kunci
          </button>
        </form>
      )}
    </div>
  )
}
export function LockScreen({
  onUnlock,
  onReset,
}: {
  onUnlock: () => void
  onReset: () => Promise<void>
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [biometric, setBiometric] = useState(false)
  const authenticating = useRef(false)
  useEffect(() => {
    getLock()
      .then((c) => setBiometric(!!c?.biometric && Capacitor.isNativePlatform()))
      .catch((e) => setError(e.message))
  }, [])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (authenticating.current) return
    authenticating.current = true
    setBusy(true)
    setError('')
    try {
      await checkPin(String(new FormData(e.currentTarget).get('pin')))
      onUnlock()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      authenticating.current = false
      setBusy(false)
    }
  }
  async function bio() {
    if (authenticating.current) return
    authenticating.current = true
    setBusy(true)
    setError('')
    try {
      await unlockBiometric()
      onUnlock()
    } catch (e) {
      setError(biometricErrorMessage(e))
    } finally {
      authenticating.current = false
      setBusy(false)
    }
  }
  async function reset() {
    if (
      !confirm(
        'Lupa PIN? Semua data lokal akan dihapus. Kamu hanya bisa memulihkannya dari backup.',
      )
    )
      return
    if (prompt('Ketik HAPUS untuk mereset data dan PIN.') !== 'HAPUS') return
    setBusy(true)
    try {
      await onReset()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="lock-screen">
      <Brand />
      <div className="lock-art">
        <LockKeyhole size={44} />
      </div>
      <h1>Ruang pribadimu.</h1>
      <p>Masukkan PIN untuk membuka Think Twice.</p>
      <form className="stack" onSubmit={submit}>
        <label>
          PIN 6 digit
          <input
            autoFocus
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="off"
          />
        </label>
        <ErrorText message={error} />
        <button className="primary wide" disabled={busy}>
          Buka aplikasi
        </button>
      </form>
      {biometric && (
        <button className="secondary wide" onClick={bio} disabled={busy}>
          <Fingerprint size={20} />
          Gunakan biometrik
        </button>
      )}
      <button className="text-button" onClick={reset} disabled={busy}>
        Lupa PIN?
      </button>
    </main>
  )
}
export function Settings({
  state,
  save,
  open,
  hasLock,
  notify,
}: {
  state: State
  save: Update
  open: (mode: 'backup' | 'restore' | 'pin') => void
  hasLock: boolean
  notify: (text: string) => void
}) {
  const [busy, setBusy] = useState(false)
  async function toggle() {
    setBusy(true)
    try {
      if (!state.settings.notifications && !(await requestNotifications()))
        throw new Error(
          'Izin notifikasi belum diberikan. Kamu tetap bisa memeriksa pengingat di aplikasi.',
        )
      await save(
        change(state, (s) => {
          s.settings.notifications = !s.settings.notifications
        }),
      )
      notify('Pengaturan pengingat disimpan.')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function exportCsv() {
    try {
      await saveFile(
        `transaksi-${new Date().toISOString().slice(0, 10)}.csv`,
        csv(state),
        'text/csv',
      )
      notify('Ekspor transaksi selesai.')
    } catch (e) {
      notify((e as Error).message)
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="intro-label">Tetap dalam kendalimu</span>
        <h1>Pengaturan</h1>
        <p>Data pribadi, keputusan pribadi.</p>
      </div>
      <h2 className="settings-heading">Data & cadangan</h2>
      <div className="settings-group">
        <button onClick={() => open('backup')}>
          <Download />
          <span>
            <strong>Backup data</strong>
            <small>Simpan salinan dengan password</small>
          </span>
          <ChevronRight />
        </button>
        <button onClick={() => open('restore')}>
          <Upload />
          <span>
            <strong>Pulihkan backup</strong>
            <small>Kembalikan data dari file .thinktwice</small>
          </span>
          <ChevronRight />
        </button>
        <button onClick={exportCsv}>
          <FileSpreadsheet />
          <span>
            <strong>Ekspor transaksi</strong>
            <small>File CSV untuk spreadsheet</small>
          </span>
          <ArrowUpRight />
        </button>
      </div>
      <h2 className="settings-heading">Privasi & pengingat</h2>
      <div className="settings-group">
        <button onClick={() => open('pin')}>
          <LockKeyhole />
          <span>
            <strong>Kunci aplikasi</strong>
            <small>
              {hasLock ? 'Aktif · kelola PIN dan biometrik' : 'Atur PIN 6 digit dan biometrik'}
            </small>
          </span>
          <ChevronRight />
        </button>
        <button
          onClick={toggle}
          disabled={busy}
          role="switch"
          aria-checked={state.settings.notifications}
        >
          <Bell />
          <span>
            <strong>Pengingat lokal</strong>
            <small>Jeda selesai & Minggu pukul 19.00</small>
          </span>
          <span className={`switch ${state.settings.notifications ? 'on' : ''}`} />
        </button>
      </div>
      <div className="privacy-card">
        <ShieldCheck size={30} />
        <h3>Keuanganmu tetap milikmu.</h3>
        <p>
          Tanpa akun. Tanpa server. Semua catatan ada di perangkat ini. Simpan backup secara berkala
          ke tempat yang aman.
        </p>
        <small>Think Twice · versi 1.0.1</small>
      </div>
    </>
  )
}
