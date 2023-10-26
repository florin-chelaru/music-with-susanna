export function dateStringToPrettyDate(date?: string): string {
  const result = date ? prettyDate(new Date(date)) : ''
  return result
}

export function prettyDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
