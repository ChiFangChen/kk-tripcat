import { useRef, useCallback } from 'react'

/**
 * Returns a getHandler function for detecting double-tap on mobile.
 * Usage: doubleTap(key, onDoubleTap) → onClick handler
 * The first tap does nothing extra; the second tap within `delay` ms fires onDoubleTap.
 */
export function useDoubleTap(delay = 300) {
  const lastTap = useRef<Record<string, number>>({})

  const getHandler = useCallback((key: string, onDoubleTap: () => void) => {
    return (e: React.MouseEvent) => {
      const now = Date.now()
      if (now - (lastTap.current[key] || 0) < delay) {
        e.preventDefault()
        e.stopPropagation()
        onDoubleTap()
        lastTap.current[key] = 0
      } else {
        lastTap.current[key] = now
      }
    }
  }, [delay])

  return getHandler
}
