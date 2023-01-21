/**
 * Scrolls to the given element. If no offset is given, 56 is used, which is the default for the MUI Toolbar
 * @param element
 * @param offset
 */
export function scrollToElement(element: HTMLDivElement, offset: number = 56) {
  // Using setTimeout to call scrollIntoView asynchronously, after the sidebar has closed
  setTimeout(() => {
    const targetPosition = element.getBoundingClientRect().top + scrollY - offset
    scrollTo({ top: targetPosition })
  }, 0)
}

export function scrollToTop() {
  // Using setTimeout to call scrollIntoView asynchronously
  setTimeout(() => {
    scrollTo({ top: 0 })
  }, 0)
}
