import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { State } from '../core/model'
export async function requestNotifications() {
  if (!Capacitor.isNativePlatform())
    throw new Error('Pengingat lokal tersedia di aplikasi Android.')
  return (await LocalNotifications.requestPermissions()).display === 'granted'
}
export async function syncNotifications(state: State) {
  if (!Capacitor.isNativePlatform()) return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length)
    await LocalNotifications.cancel({ notifications: pending.notifications })
  if (
    !state.settings.notifications ||
    (await LocalNotifications.checkPermissions()).display !== 'granted'
  )
    return
  const notifications = state.plans
    .filter((p) => p.status === 'waiting' && Date.parse(p.readyAt) > Date.now())
    .map((p, i) => ({
      id: i + 1,
      title: 'Sudah 24 jam. Masih ingin membelinya?',
      body: p.name,
      extra: { page: 'waiting' },
      schedule: { at: new Date(p.readyAt) },
    }))
  await LocalNotifications.schedule({
    notifications: [
      ...notifications,
      {
        id: 2_000_000_000,
        title: 'Waktunya review mingguan',
        body: 'Lihat ke mana uangmu pergi minggu ini.',
        extra: { page: 'review' },
        schedule: { on: { weekday: 1, hour: 19, minute: 0 }, repeats: true },
      },
    ],
  })
}
