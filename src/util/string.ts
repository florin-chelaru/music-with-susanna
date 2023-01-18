export function shortenText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.substring(0, maxLength)}...`
}

export function withBaseURL(url: string): string {
  return `${process.env.PUBLIC_URL}${url}`
}
