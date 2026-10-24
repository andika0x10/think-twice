import { Capacitor, registerPlugin } from '@capacitor/core'
interface FileBridge {
  save(options: { name: string; content: string; mime: string }): Promise<void>
  open(): Promise<{ content: string }>
}
const NativeFiles = registerPlugin<FileBridge>('ThinkTwiceFiles')
export async function saveFile(name: string, content: string, mime: string) {
  if (Capacitor.isNativePlatform()) return NativeFiles.save({ name, content, mime })
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function openFile(): Promise<string> {
  if (Capacitor.isNativePlatform()) return (await NativeFiles.open()).content
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.thinktwice,application/json'
    input.onchange = async () => {
      try {
        const file = input.files?.[0]
        if (!file) throw new Error('Tidak ada file dipilih.')
        if (file.size > 10_000_000) throw new Error('Ukuran backup maksimal 10 MB.')
        resolve(await file.text())
      } catch (e) {
        reject(e)
      }
    }
    input.oncancel = () => reject(new Error('Pemilihan file dibatalkan.'))
    input.click()
  })
}
