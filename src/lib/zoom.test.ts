import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lockZoom } from './zoom'

function touchMove(touches: number): Event {
  const event = new Event('touchmove', { cancelable: true })
  Object.defineProperty(event, 'touches', { value: { length: touches } })
  return event
}

describe('lockZoom', () => {
  it('prevents Safari pinch gestures', () => {
    const unlock = lockZoom(document)
    const event = new Event('gesturestart', { cancelable: true })

    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    unlock()
  })

  it('prevents a two-finger move but allows one-finger scrolling', () => {
    const unlock = lockZoom(document)
    const pinch = touchMove(2)
    const scroll = touchMove(1)

    document.dispatchEvent(pinch)
    document.dispatchEvent(scroll)

    expect(pinch.defaultPrevented).toBe(true)
    expect(scroll.defaultPrevented).toBe(false)
    unlock()
  })

  it('stops guarding after cleanup', () => {
    const unlock = lockZoom(document)
    unlock()
    const event = new Event('gesturestart', { cancelable: true })

    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('locks the viewport scale in the document head', () => {
    const html = readFileSync('index.html', 'utf8')

    expect(html).toMatch(/name="viewport"[^>]*maximum-scale=1\.0/)
    expect(html).toMatch(/name="viewport"[^>]*user-scalable=no/)
  })
})
