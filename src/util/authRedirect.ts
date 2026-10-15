// Where someone was going before they were asked to sign in.
//
// Every protected page guards itself with an inline effect that sends a signed-out visitor to
// `/login`, and until now that threw away the destination: a parent tapping "submit your
// availability" in an email landed on the subjects page with no hint of what they came for.
//
// Carried in the query string rather than router state, because router state does not survive
// the 404.html round-trip that makes deep links work on GitHub Pages at all — that redirect
// rebuilds the URL and query string, not `history.state`. The email case is exactly the one
// that round-trip handles, so the query string is the only option that works where it matters.

const NEXT_PARAM = 'next'

/** The login URL, remembering where the caller was headed. */
export function loginPath(): string {
  const here = `${window.location.pathname}${window.location.search}`
  // Nothing to remember about the front door, and a `next` of "/" would only add noise.
  return here === '/' ? '/login' : `/login?${NEXT_PARAM}=${encodeURIComponent(here)}`
}

/**
 * The destination to resume after signing in, or null to use the role's default.
 *
 * Only ever a path on this site. A `next` pointing somewhere else would turn the login page into
 * an open redirect — a link that looks like ours, asks for a password, and lands the person
 * somewhere that is not us.
 */
export function nextPath(search: string): string | null {
  const raw = new URLSearchParams(search).get(NEXT_PARAM)
  if (!raw) return null
  // A leading "//" is a protocol-relative URL: "//evil.example" is off-site despite the slash.
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}
