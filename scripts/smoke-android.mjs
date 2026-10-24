import { _android, expect as baseExpect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const expect = baseExpect.configure({ timeout: 30000 })

// Run against a fresh emulator with the debug APK already installed.
const devices = await _android.devices()
const device = devices.find((d) => d.serial().startsWith('emulator-'))
if (!device) throw new Error('Jalankan emulator Android terlebih dahulu.')
device.setDefaultTimeout(30000)
const pkg = 'com.andika.thinktwice'
await device.shell(`am start -n ${pkg}/.MainActivity`)
async function appPage() {
  return await (await device.webView({ pkg })).page()
}
let page = await appPage()
async function restart() {
  const closed = page.waitForEvent('close')
  await device.shell(`am force-stop ${pkg}`)
  await closed
  await device.shell(`am start -n ${pkg}/.MainActivity`)
  page = await appPage()
}
page.on('pageerror', (error) => console.error('WebView:', error.message))
await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
if (await page.getByLabel('Saldo awal kamu').isVisible()) {
  await page.getByLabel('Saldo awal kamu').fill('1000000')
  await page.getByLabel('Alokasi Harian').fill('600000')
  await page.getByLabel('Alokasi Keinginan').fill('200000')
  await page.getByLabel('Alokasi Tabungan').fill('200000')
  await page.getByRole('button', { name: 'Mulai lebih sadar' }).click()
}
await expect(page.locator('.hero-amount')).toContainText('1.000.000')
console.log('PASS native onboarding and SQLite write')
await page.getByRole('button', { name: 'Pengeluaran', exact: true }).click()
await page.getByLabel('Nominal', { exact: true }).fill('50000')
await page.getByLabel('Nama transaksi').fill('Buku untuk nanti')
await page.getByRole('button', { name: 'Keinginan', exact: true }).click()
await page.getByRole('button', { name: 'Jeda & cadangkan dana' }).click()
await expect(page.getByRole('dialog')).not.toBeVisible()
await expect(page.locator('.hero-amount')).toContainText('950.000')
await restart()
await expect(page.locator('.hero-amount')).toContainText('950.000')
console.log('PASS SQLite persistence after process restart and reservation')
await mkdir('test-results', { recursive: true })
await page.screenshot({ path: 'test-results/android-home.png' })
await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
await device.shell(`pm grant ${pkg} android.permission.POST_NOTIFICATIONS`)
await page.getByRole('switch').click()
await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
await expect
  .poll(
    async () =>
      (await page.evaluate(() => window.Capacitor.Plugins.LocalNotifications.getPending()))
        .notifications.length,
  )
  .toBe(2)
console.log('PASS native reminders scheduled for waiting item and weekly review')
await page.getByRole('button', { name: /Backup data/ }).click()
await page.getByLabel('Password backup', { exact: true }).fill('native-backup-password')
await page.getByLabel('Ulangi password').fill('native-backup-password')
await page.getByRole('button', { name: 'Simpan backup terenkripsi' }).click()
await expect
  .poll(async () => (await device.shell('dumpsys activity activities')).toString())
  .toMatch(/documentsui/i)
// The first Back may dismiss the picker keyboard. Continue until the app resumes.
for (let attempt = 0; attempt < 3; attempt++) {
  await device.shell('input keyevent KEYCODE_BACK')
  await page.waitForTimeout(300)
  if ((await page.evaluate(() => window.Capacitor.Plugins.App.getState())).isActive) break
}
await expect(page.getByRole('alert')).toContainText('dibatalkan')
await page.getByRole('button', { name: 'Tutup', exact: true }).click()
console.log('PASS native save-file dialog and safe cancellation')
await page.getByRole('button', { name: /Kunci aplikasi/ }).click()
await page.getByLabel('PIN baru (6 digit)').fill('123456')
await page.getByLabel('Ulangi PIN').fill('123456')
await page.getByRole('button', { name: 'Simpan kunci aplikasi' }).click()
await expect(page.getByRole('dialog')).not.toBeVisible()
await restart()
await expect(page.getByRole('heading', { name: 'Ruang pribadimu.' })).toBeVisible()
await page.getByLabel('PIN 6 digit').fill('000000')
await page.getByRole('button', { name: 'Buka aplikasi' }).click()
await expect(page.getByRole('alert')).toContainText('PIN tidak cocok')
await page.getByLabel('PIN 6 digit').fill('123456')
await page.getByRole('button', { name: 'Buka aplikasi' }).click()
await expect(page.locator('.hero-amount')).toContainText('950.000')
console.log('PASS native Keystore PIN, cold start lock, wrong and correct PIN')
await device.shell('input keyevent KEYCODE_HOME')
await expect
  .poll(async () => (await page.evaluate(() => window.Capacitor.Plugins.App.getState())).isActive)
  .toBe(false)
const backgroundAt = await page.evaluate(() => Date.now())
console.log('Checking 30-second background lock…')
await new Promise((resolve) => setTimeout(resolve, 35000))
await expect
  .poll(async () => await page.evaluate(() => Date.now()))
  .toBeGreaterThanOrEqual(backgroundAt + 31000)
await device.shell(`am start -n ${pkg}/.MainActivity`)
await expect(page.getByRole('heading', { name: 'Ruang pribadimu.' })).toBeVisible()
console.log('PASS native resume lock after 30 seconds')
await device.close()
