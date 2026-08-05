# Send Email Cloud Function

## Overview

A new Firebase Cloud Function (`sendEmail`) that allows authenticated users to send emails via Gmail, with optional iCal calendar event attachments for scheduling or canceling lessons/appointments.

## Implementation

**File:** `functions/src/sendEmail.ts`

**Dependencies added:**
- `nodemailer` — sends email via Gmail SMTP
- `ical-generator` — generates `.ics` calendar invite attachments

**Authentication:** Requires a valid Firebase ID token. Only `teacher` and `student` roles are authorized.

**Secrets (Firebase):**
- `GMAIL_USER` — the Gmail address used as the sender
- `GMAIL_APP_PASSWORD` — a Gmail App Password (not the account password)

**Region:** `europe-west1`

## Request Body

```json
{
  "to": "recipient@example.com",
  "subject": "Lesson confirmation",
  "text": "Plain text body",
  "html": "<p>HTML body</p>",
  "calendarEvent": {
    "uid": "unique-event-id",
    "title": "Piano Lesson",
    "start": "2026-08-10T10:00:00Z",
    "end": "2026-08-10T11:00:00Z",
    "location": "Studio A",
    "description": "Weekly lesson",
    "method": "request"
  }
}
```

- `to`, `subject`, and at least one of `text`/`html` are required.
- `calendarEvent` is optional. If provided, `uid`, `title`, `start`, and `end` are required.
- `calendarEvent.method` defaults to `"request"`; use `"cancel"` to send a cancellation.

## What's Still Missing / To Do

1. **Firebase secrets must be set before deploying:**
   ```
   firebase functions:secrets:set GMAIL_USER
   firebase functions:secrets:set GMAIL_APP_PASSWORD
   ```
   The Gmail account must have 2-Step Verification enabled, and the App Password is generated at myaccount.google.com → Security → App Passwords.

2. **`from` display name** — currently sends as the raw email address. Consider setting `from: "Music with Susanna <${GMAIL_USER.value()}>"` for a friendlier sender label.

3. **iCal `SEQUENCE` number** — calendar clients use this to match updates/cancellations to the original event. Currently not set (defaults to 0), so sending a cancel for a previously sent invite may not auto-remove the event in some clients. The caller should track and increment this per-event.

4. **Unhandled unknown errors return a generic 500** — the final `throw new InternalServerError(...)` is caught by Firebase runtime as an uncaught exception, so the formatted error message is not sent to the client. Should be `response.status(500).send(...)` instead.

5. **No frontend integration yet** — nothing in the web app calls this function yet.

## How to Test

### Prerequisites
1. Set secrets (see above).
2. Deploy: `firebase deploy --only functions:sendEmail`
3. Obtain a Firebase ID token for a teacher or student account (e.g., from the browser devtools → Application → IndexedDB → `firebaseLocalStorageDb`, or by calling `firebase.auth().currentUser.getIdToken()`).

### curl example
```bash
curl -X POST https://europe-west1-<project-id>.cloudfunctions.net/sendEmail \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test email",
    "text": "Hello from Music with Susanna"
  }'
```

### With a calendar invite
```bash
curl -X POST https://europe-west1-<project-id>.cloudfunctions.net/sendEmail \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Lesson on Aug 10",
    "html": "<p>Your lesson is confirmed.</p>",
    "calendarEvent": {
      "uid": "lesson-2026-08-10",
      "title": "Piano Lesson",
      "start": "2026-08-10T10:00:00Z",
      "end": "2026-08-10T11:00:00Z",
      "method": "request"
    }
  }'
```

### Local emulator (no deploy needed)
```bash
cd functions && npm run build
firebase emulators:start --only functions
# Then POST to http://127.0.0.1:5001/<project-id>/europe-west1/sendEmail
# Note: secrets are not available in the emulator by default.
# Set GMAIL_USER and GMAIL_APP_PASSWORD as environment variables instead,
# or use firebase emulators:start --import=./emulator-data after exporting secrets.
```
