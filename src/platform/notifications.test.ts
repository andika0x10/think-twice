import { beforeEach, expect, it, vi } from 'vitest'
import { defer, freshState } from '../core/model'
const api = vi.hoisted(() => ({
  getPending: vi.fn(),
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  schedule: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: api }))
import { requestNotifications, syncNotifications } from './notifications'
beforeEach(() => {
  vi.clearAllMocks()
  api.getPending.mockResolvedValue({ notifications: [{ id: 1 }] })
  api.cancel.mockResolvedValue(undefined)
  api.schedule.mockResolvedValue(undefined)
  api.checkPermissions.mockResolvedValue({ display: 'granted' })
  api.requestPermissions.mockResolvedValue({ display: 'granted' })
})
it('cancels all reminders when disabled or permission denied', async () => {
  await syncNotifications(freshState())
  expect(api.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] })
  expect(api.schedule).not.toHaveBeenCalled()
  api.checkPermissions.mockResolvedValue({ display: 'denied' })
  const s = freshState()
  s.settings.notifications = true
  await syncNotifications(s)
  expect(api.schedule).not.toHaveBeenCalled()
})
it('schedules future waiting items and Sunday 19:00, omits resolved and past items', async () => {
  let s = freshState()
  s.onboarded = true
  s.pockets = [{ id: 'a', name: 'A', color: '#FFF9D2', archived: false }]
  s.entries = [
    {
      id: 'e',
      pocketId: 'a',
      kind: 'opening',
      amount: 100,
      name: 'Awal',
      category: 'Awal',
      note: '',
      at: new Date().toISOString(),
    },
  ]
  s = defer(s, {
    pocketId: 'a',
    amount: 10,
    name: 'Buku',
    category: 'Belanja',
    need: 'want',
    note: '',
  })
  s.settings.notifications = true
  await syncNotifications(s)
  const notifications = api.schedule.mock.calls[0][0].notifications
  expect(notifications).toHaveLength(2)
  expect(notifications[0].schedule.at.getTime()).toBe(Date.parse(s.plans[0].readyAt))
  expect(notifications[1].schedule).toEqual({
    on: { weekday: 1, hour: 19, minute: 0 },
    repeats: true,
  })
  s.plans[0].status = 'cancelled'
  await syncNotifications(s)
  expect(api.schedule.mock.calls[1][0].notifications).toHaveLength(1)
})
it('returns denied permission without enabling reminders', async () => {
  api.requestPermissions.mockResolvedValue({ display: 'denied' })
  expect(await requestNotifications()).toBe(false)
})
