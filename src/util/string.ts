export function shortenText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.substring(0, maxLength)}...`
}

export function withBaseURL(url: string): string {
  return `${process.env.PUBLIC_URL}${url}`
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateRandomAlphanumericString(length: number): string {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(
    ''
  )
}

export function extractFileNameAndExtension(fullPath: string): { name: string; extension: string } {
  const lastIndex = fullPath.lastIndexOf('/')
  const fileNameWithExtension = fullPath.slice(lastIndex + 1)
  const lastDotIndex = fileNameWithExtension.lastIndexOf('.')

  if (lastDotIndex !== -1) {
    const name = fileNameWithExtension.slice(0, lastDotIndex)
    const extension = fileNameWithExtension.slice(lastDotIndex + 1)
    return { name, extension }
  }

  return { name: fileNameWithExtension, extension: '' }
}
