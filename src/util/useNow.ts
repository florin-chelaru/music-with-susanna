import { useEffect, useState } from 'react'

/**
 * The current time, re-read on an interval so a countdown or a "deadline passed" check keeps
 * up without the caller wiring its own timer.
 *
 * Defaults to once a minute, which is as fine as any deadline in this app is shown. A
 * second-by-second counter would imply a precision a submission deadline does not have.
 */
export function useNow(intervalMs: number = 60000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalMs])
  return now
}
