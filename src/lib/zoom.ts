const GESTURE_EVENTS = ['gesturestart', 'gesturechange', 'gestureend'] as const

function preventGesture(event: Event): void {
  event.preventDefault()
}

function preventPinch(event: Event): void {
  const touches = (event as Event & { touches?: { length: number } }).touches
  if (touches && touches.length > 1) event.preventDefault()
}

export function lockZoom(target: Document = document): () => void {
  for (const name of GESTURE_EVENTS) {
    target.addEventListener(name, preventGesture, { passive: false })
  }
  target.addEventListener('touchmove', preventPinch, { passive: false })
  return () => {
    for (const name of GESTURE_EVENTS) {
      target.removeEventListener(name, preventGesture)
    }
    target.removeEventListener('touchmove', preventPinch)
  }
}
