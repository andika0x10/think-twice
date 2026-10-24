import { gsap } from 'gsap'

export const motion = {
  enter: 0.7,
  navigate: 0.22,
  sheetOpen: 0.32,
  sheetClose: 0.18,
  feedback: 0.4,
  progress: 0.4,
  settle: 'back.out(1.7)',
}

// Each animation owns its styles and listener, including during Strict Mode replay.
// Switching to reduced motion finishes immediately, including exit callbacks.
export function animate(
  scope: Element,
  build: (timeline: gsap.core.Timeline) => void,
  complete?: () => void,
) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  if (preference.matches) {
    complete?.()
    return () => {}
  }
  let timeline: gsap.core.Timeline
  const context = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, onComplete: complete })
    build(timeline)
    timeline.play()
  }, scope)
  const finish = () => {
    if (preference.matches) timeline.progress(1)
  }
  preference.addEventListener('change', finish)
  return () => {
    preference.removeEventListener('change', finish)
    context.revert()
  }
}

export function bounceCoins(scope: Element) {
  const coins = scope.querySelectorAll('.coin')
  return animate(scope, (timeline) => {
    coins.forEach((coin, index) => {
      timeline.from(
        coin,
        {
          y: -28,
          rotation: '+=14',
          duration: motion.feedback,
          ease: motion.settle,
          clearProps: 'transform',
        },
        index * 0.08,
      )
    })
  })
}
