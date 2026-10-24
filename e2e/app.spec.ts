import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
async function onboard(page: Page) {
  await page.goto('/')
  await page.getByLabel('Saldo awal kamu').fill('3000000')
  await page.getByLabel('Alokasi Harian').fill('1500000')
  await page.getByLabel('Alokasi Keinginan').fill('500000')
  await page.getByLabel('Alokasi Tabungan').fill('1000000')
  await page.getByRole('button', { name: 'Mulai lebih sadar' }).click()
  await expect(page.getByRole('heading', { name: 'Punya rencana. Punya kendali.' })).toBeVisible()
}
async function transaction(
  page: Page,
  kind: 'Pemasukan' | 'Pengeluaran',
  name: string,
  amount: string,
  want = false,
) {
  await page.getByRole('button', { name: kind, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nominal', { exact: true }).fill(amount)
  await dialog.getByLabel('Nama transaksi').fill(name)
  if (want) await dialog.getByRole('button', { name: 'Keinginan', exact: true }).click()
  await dialog
    .getByRole('button', { name: want ? 'Jeda & cadangkan dana' : 'Simpan transaksi', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
}
test('onboarding, ledger, reservation, cancellation and persistence', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await onboard(page)
  await page.screenshot({ path: 'test-results/01-home.png', fullPage: true })
  await transaction(page, 'Pemasukan', 'Gaji Oktober', '500000')
  await transaction(page, 'Pengeluaran', 'Makan siang', '25000')
  await transaction(page, 'Pengeluaran', 'Sepatu impian', '200000', true)
  await page.getByRole('navigation').getByRole('button', { name: 'Daftar Tunggu' }).click()
  await expect(page.getByRole('heading', { name: 'Sepatu impian' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Beli', exact: true })).toBeDisabled()
  await page.screenshot({ path: 'test-results/02-waiting.png', fullPage: true })
  await page.reload()
  await page.getByRole('navigation').getByRole('button', { name: 'Daftar Tunggu' }).click()
  await expect(page.getByRole('heading', { name: 'Sepatu impian' })).toBeVisible()
  await page.getByRole('button', { name: 'Batalkan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pikiran sedang lega.' })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Riwayat' }).click()
  await page.getByLabel('Cari transaksi').fill('Makan siang')
  await expect(page.locator('.entry-row')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/03-history.png', fullPage: true })
  await page.locator('.entry-row').click()
  await page.getByRole('dialog').getByLabel('Nominal', { exact: true }).fill('30000')
  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
  await expect(page.locator('.hero-amount')).toContainText('3.470.000')
  expect(errors).toEqual([])
})
test('pocket goal, transfer, review and PIN lock', async ({ page }) => {
  await onboard(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Kantong', exact: true }).click()
  await page.getByRole('button', { name: 'Kantong baru' }).click()
  await page.getByLabel('Nama kantong', { exact: true }).fill('Liburan')
  await page.getByLabel('Target tabungan (opsional)').fill('5000000')
  await page.getByRole('button', { name: 'Simpan kantong' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Transfer', exact: true }).click()
  await page.getByLabel('Nominal', { exact: true }).fill('100000')
  await page.getByLabel('Nama transaksi').fill('Isi liburan')
  await page.getByLabel('Ke kantong').selectOption({ label: 'Liburan — Rp 0' })
  await page.getByRole('button', { name: 'Pindahkan dana' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.screenshot({ path: 'test-results/04-pockets.png', fullPage: true })
  await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
  await page.getByRole('button', { name: /Ruang refleksi/ }).click()
  await page.screenshot({ path: 'test-results/05-review.png', fullPage: true })
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  await page.screenshot({ path: 'test-results/06-settings.png', fullPage: true })
  await page.getByRole('button', { name: /Kunci aplikasi/ }).click()
  await page.getByLabel('PIN baru (6 digit)').fill('123456')
  await page.getByLabel('Ulangi PIN').fill('123456')
  await page.getByRole('button', { name: 'Simpan kunci aplikasi' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ruang pribadimu.' })).toBeVisible()
  await page.getByLabel('PIN 6 digit').fill('000000')
  await page.getByRole('button', { name: 'Buka aplikasi' }).click()
  await expect(page.getByRole('alert')).toContainText('PIN tidak cocok')
  await page.getByLabel('PIN 6 digit').fill('123456')
  await page.getByRole('button', { name: 'Buka aplikasi' }).click()
  await expect(page.getByRole('heading', { name: 'Punya rencana. Punya kendali.' })).toBeVisible()
})
test('onboarding validates totals and layout fits 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await page.screenshot({ path: 'test-results/00-onboarding.png', fullPage: true })
  await page.getByLabel('Saldo awal kamu').fill('500000')
  await page.getByRole('button', { name: 'Mulai lebih sadar' }).click()
  await expect(page.getByRole('alert')).toContainText('harus sama')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('confirms a purchase only after 24 hours', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-24T10:00:00+07:00') })
  await onboard(page)
  await transaction(page, 'Pengeluaran', 'Headphone', '200000', true)
  await page.getByRole('navigation').getByRole('button', { name: 'Daftar Tunggu' }).click()
  await expect(page.getByRole('button', { name: 'Beli', exact: true })).toBeDisabled()
  await page.clock.fastForward(86_400_000)
  await expect(page.getByRole('button', { name: 'Beli', exact: true })).toBeEnabled()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Beli', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pikiran sedang lega.' })).toBeVisible()
  await page.getByRole('button', { name: 'Sudah diputuskan' }).click()
  await expect(page.getByText('Dibeli', { exact: true })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
  await expect(page.locator('.hero-amount')).toContainText('2.800.000')
})

test('backup and CSV downloads, restore validation and atomic replacement', async ({ page }) => {
  await onboard(page)
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  await page.getByRole('button', { name: 'Backup data', exact: false }).click()
  await page.getByLabel('Password backup', { exact: true }).fill('backup-password')
  await page.getByLabel('Ulangi password').fill('backup-password')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Simpan backup terenkripsi' }).click()
  const download = await downloadEvent
  const path = (await download.path())!
  const content = await readFile(path, 'utf8')
  expect(JSON.parse(content).format).toBe('thinktwice')
  expect(content).not.toContain('Harian')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
  await transaction(page, 'Pemasukan', 'Tambahan setelah backup', '500000')
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  await page.getByRole('button', { name: /Pulihkan backup/ }).click()
  await page.getByLabel('Password backup', { exact: true }).fill('password-salah')
  let chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Pilih & pulihkan backup' }).click()
  await (await chooserEvent).setFiles(path)
  await expect(page.getByRole('alert')).toContainText('password salah')
  await page.getByLabel('Password backup', { exact: true }).fill('backup-password')
  page.once('dialog', (d) => d.accept())
  chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Pilih & pulihkan backup' }).click()
  await (await chooserEvent).setFiles(path)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
  await expect(page.locator('.hero-amount')).toContainText('3.000.000')
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  const csvEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: /Ekspor transaksi/ }).click()
  const csvDownload = await csvEvent
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/)
  expect(await readFile((await csvDownload.path())!, 'utf8')).toContain('Saldo awal')
  await page.getByRole('switch').click()
  await expect(page.getByRole('status')).toContainText('Android')
})

test.describe('playful motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('entrances settle, navigation can be interrupted, and sheet retains focus through exit', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await onboard(page)
    const hero = page.locator('.hero-pocket')
    await expect.poll(() => hero.evaluate((element) => element.style.transform)).not.toBe('')
    await expect.poll(() => hero.evaluate((element) => element.style.transform)).toBe('')
    const restingRotation = await hero.evaluate((element) => getComputedStyle(element).transform)
    expect(restingRotation).not.toBe('none')
    await page.reload()
    await expect(hero).toBeVisible()
    await expect.poll(() => hero.evaluate((element) => element.style.transform)).not.toBe('')
    await expect.poll(() => hero.evaluate((element) => element.style.transform)).toBe('')
    expect(await hero.evaluate((element) => getComputedStyle(element).transform)).toBe(
      restingRotation,
    )
    await page.evaluate(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>('.bottom-nav button')
      buttons[1].click()
    })
    await expect(page.getByRole('heading', { name: 'Kantong kamu', exact: true })).toBeVisible()
    await page.evaluate(() =>
      document.querySelectorAll<HTMLButtonElement>('.bottom-nav button')[0].click(),
    )
    await expect
      .poll(() => page.locator('.main-content').evaluate((element) => element.style.transform))
      .toBe('')
    await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
    expect(await page.locator('.main-content').evaluate((element) => element.style.transform)).toBe(
      '',
    )

    const trigger = page.getByRole('button', { name: 'Pemasukan', exact: true })
    for (const method of ['button', 'escape', 'backdrop']) {
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect.poll(() => dialog.evaluate((element) => element.style.transform)).toBe('')
      if (method === 'escape') await page.keyboard.press('Escape')
      else if (method === 'backdrop') await page.mouse.click(2, 2)
      else {
        const duringExit = await dialog.evaluate(async (element) => {
          element.querySelector<HTMLButtonElement>('button[aria-label="Tutup"]')!.click()
          await new Promise(requestAnimationFrame)
          return {
            closing: element.getAttribute('data-closing'),
            open: (element as HTMLDialogElement).open,
            focusInside: element.contains(document.activeElement),
          }
        })
        expect(duringExit).toEqual({ closing: 'true', open: true, focusInside: true })
      }
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
    }
    await page.screenshot({ path: 'test-results/motion-mobile.png', fullPage: true })
    expect(errors).toEqual([])
  })

  test('saving succeeds after sheet exit; validation failure keeps dialog open', async ({
    page,
  }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Pengeluaran', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nominal', { exact: true }).fill('999999999')
    await dialog.getByLabel('Nama transaksi').fill('Melebihi saldo')
    await dialog.getByRole('button', { name: 'Simpan transaksi', exact: true }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('status')).not.toBeVisible()
    await dialog.getByLabel('Nominal', { exact: true }).fill('10000')
    const exitFocus = dialog.evaluate(
      (element) =>
        new Promise<boolean>((resolve) => {
          const observer = new MutationObserver(() => {
            if (!element.hasAttribute('data-closing')) return
            observer.disconnect()
            resolve(element.contains(document.activeElement))
          })
          observer.observe(element, { attributes: true, attributeFilter: ['data-closing'] })
        }),
    )
    await dialog.getByRole('button', { name: 'Simpan transaksi', exact: true }).click()
    expect(await exitFocus).toBeTruthy()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('Tersimpan')
    await expect
      .poll(() => page.locator('.coin-one').evaluate((element) => element.style.transform))
      .not.toBe('')
    await expect(page.locator('.hero-amount')).toContainText('2.990.000')
    await expect
      .poll(() => page.locator('.coin-one').evaluate((element) => element.style.transform))
      .toBe('')
    await page.getByRole('navigation').getByRole('button', { name: 'Kantong', exact: true }).click()
    await page.getByRole('navigation').getByRole('button', { name: 'Beranda' }).click()
    await expect
      .poll(() => page.locator('.coin-one').evaluate((element) => element.style.transform))
      .toBe('')
  })

  test('runtime reduced motion finishes entrances and exits immediately', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Pemasukan', exact: true }).click()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const dialog = page.getByRole('dialog')
    await expect.poll(() => dialog.evaluate((element) => element.style.transform)).toBe('')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await transaction(page, 'Pemasukan', 'Tanpa motion', '10000')
    expect(await page.locator('.coin-one').evaluate((element) => element.style.transform)).toBe('')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('button', { name: 'Pemasukan', exact: true }).click()
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(dialog).toHaveCount(0)
  })

  test('unlock replays the hero and privacy immediately covers an open sheet', async ({ page }) => {
    await onboard(page)
    await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
    await page.getByRole('button', { name: /Kunci aplikasi/ }).click()
    await page.getByLabel('PIN baru (6 digit)').fill('123456')
    await page.getByLabel('Ulangi PIN').fill('123456')
    await page.getByRole('button', { name: 'Simpan kunci aplikasi' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await page.reload()
    await page.getByLabel('PIN 6 digit').fill('123456')
    await page.getByRole('button', { name: 'Buka aplikasi' }).click()
    await expect
      .poll(() => page.locator('.hero-pocket').evaluate((element) => element.style.transform))
      .not.toBe('')
    await page.getByRole('button', { name: 'Pemasukan', exact: true }).click()
    await page.getByLabel('Nama transaksi').fill('Tetap di formulir')
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.locator('.privacy-overlay')).toBeVisible()
    await expect(page.locator('dialog')).toHaveCSS('visibility', 'hidden')
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByLabel('Nama transaksi')).toHaveValue('Tetap di formulir')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  for (const width of [360, 1280]) {
    test(`motion layout and target progress at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await onboard(page)
      await page.getByRole('button', { name: /Harian.*Siap digunakan/ }).click()
      await page.getByLabel('Target tabungan (opsional)').fill('3000000')
      await page.getByRole('button', { name: 'Simpan kantong' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
      const bar = page.locator('.home-pockets .progress-track > span')
      await expect.poll(() => bar.evaluate((element) => element.style.width)).toBe('50%')
      await page.screenshot({ path: `test-results/motion-${width}.png`, fullPage: true })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy()
      await page.getByRole('button', { name: 'Pemasukan', exact: true }).click()
      await page.screenshot({ path: `test-results/motion-sheet-${width}.png` })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await transaction(page, 'Pemasukan', 'Progres baru', '300000')
      await expect.poll(() => bar.evaluate((element) => element.style.width)).toBe('60%')
      expect(await bar.evaluate((element) => element.style.transform)).toBe('')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await transaction(page, 'Pengeluaran', 'Kosongkan Harian', '1800000')
      await expect.poll(() => bar.evaluate((element) => element.style.width)).toBe('0%')
    })
  }
})
