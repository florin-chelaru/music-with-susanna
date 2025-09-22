import { useEffect, useState } from 'react'

export function useMediaPrint() {
  const [mediaPrint, setMediaPrint] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('print')

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setMediaPrint(e.matches)
    }

    handleChange(mql) // set initial state
    mql.addEventListener('change', handleChange)

    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return mediaPrint
}
