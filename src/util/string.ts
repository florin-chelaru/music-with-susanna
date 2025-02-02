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

export function convertHtmlStringToPlain(str: string) {
  // Create a new div element
  const tempDivElement = document.createElement('div')

  // Set the HTML content with the given value
  tempDivElement.innerHTML = str

  // Retrieve the text property of the element
  return tempDivElement.textContent ?? tempDivElement.innerText ?? ''
}

export function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}

export function isValidPhoneNumber(phone: string): boolean {
  // Very basic phone number validator that checks that the input
  // matches a string that starts with a '+' followed by one or more
  // digits.
  return /^\+\d+$/.test(phone)
}
