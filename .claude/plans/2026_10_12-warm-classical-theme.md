# Plan: "Warm classical" site theme (redesign step 1)

## Context

The public site uses an almost stock MUI v5 look: Roboto, default blue `#1976d2` / purple `#9c27b0`, cool-grey page background `#DFE3E8`, white cards with soft shadows, a blue AppBar with UPPERCASE buttons. The goal is a more distinctive, "slick" look that suits a violin/viola teacher.

### How we got here (2026-10-08 → 2026-10-12)

- MUI store templates were rejected (too corporate/dashboard-like), and so were landing-page galleries (Land-book, Lapa Ninja: busy, stereotypical).
- The current site was recreated on a claude.ai Design canvas, followed by six homepage directions: A Warm classical, B Modern minimal, C Playful, D The score, E Evening concert, F Folk embroidery.
  - Workspace canvas (current site + A–F): https://claude.ai/artifact/3m7VywyqwneFd44SjwHiEw
  - A on its own (shared with Susanna): https://claude.ai/artifact/KqmARyRNDbWHeafi8WDe5D
  - C on its own (shared with Susanna): https://claude.ai/artifact/EUQog9Sju1Gd6TFUs4zJVh
- **Decision: direction A, "Warm classical".**
- The unused SJ violin logo in `public/static/img/logo/` is **not** part of the brand. It was left unused on purpose. A's colours come from violin wood, not from the logo.

### The redesign is split into four independent steps

1. **Theme**: colours, fonts and shapes, site-wide. **This plan.**
2. Header and footer layout. This must keep login/account, the language switch and the announcement banner, which the mock omits.
3. Homepage sections: arched hero, lessons and locations, featured quote, recital band, video row.
4. Copy changes (headlines, "Book a trial lesson", shorter testimonials), approved by Susanna, EN and RO.

Steps 2–4 get their own plans. This plan changes **no layout and no copy**.

---

## Requirements

- **Reversible with one switch.** One constant selects `'classic'` (today's theme, pixel-identical) or `'warm'`.
- **Previewable in production without switching everyone.** A `?theme=warm` / `?theme=classic` URL parameter overrides the constant for that browser session. Susanna can see her real site in the new theme without a Claude account.
- **Ships dark.** `ACTIVE_THEME` stays `'classic'` until the user approves. Deploying the code changes nothing for visitors.
- **Dark mode keeps working.** The site follows `prefers-color-scheme`, so `warm` needs a dark palette too. The mock only shows light.
- **Branch:** a new branch off `main` (e.g. `warm-classical-theme`), separate from the `scheduling-feature-phase-1-wip` work.

---

## Observations from the current code

The theme is well contained. Very little outside `src/theme/` needs to change.

- **`src/theme/CustomThemeProvider.tsx`**
  - Builds the theme inline.
  - **Mode:** `useMediaQuery('(prefers-color-scheme: dark)')`.
  - **Shape:** `shape.borderRadius: 8`.
  - **Dark backgrounds:** `paper #2B2D3E`, `default #343E59`.
  - **Light:** background `GREY[300]` = `#DFE3E8`, with custom `shadows` (`src/theme/shadows.ts`, tinted `#161C24`).
  - **No `primary`/`secondary` and no `typography` overrides.** Everything else is MUI defaults.
  - **Component overrides:**
    - `MuiCssBaseline`: reset and full-height html/body/#root.
    - `MuiCard`: `boxShadow: theme.shadows[2]`, `zIndex: 0` (Safari radius fix), `backgroundImage: 'none'`.
    - `MuiPopover`: `shadows[10]`.
- **`src/theme/palette.ts`** holds a Minimal-UI-style `GREY` ramp (0–900) plus alpha variants. **`src/theme/shadows.ts`** holds the light-mode shadows. Both stay as they are and are used by `classic`.
- **Pages and components use semantic props, not hex values.**
  - `color="primary|error|success|secondary"` and `variant="contained|outlined"` follow the theme automatically.
  - `LessonCalendar.tsx:217` and `AvailabilityCalendar.tsx:670` already read `theme.typography.fontFamily`.
- **Hard-coded colours outside `src/theme/`. These are the only call sites to touch:**
  - `src/Components/DrawerAppBar.tsx:88`: nav `Button sx={{ color: '#fff' }}`. It must become `color: 'inherit'`, because A's AppBar is cream with dark text and white would be invisible. The hamburger `IconButton` already uses `color="inherit"`.
  - `src/Components/UserPopover.tsx:50` (`IconButton color: '#fff'`) and `:60` (`Button color: '#fff'`) also become `'inherit'`.
  - `src/App.css:3`: Quill toolbar `background-color: #dfe3e8`. Move it into the theme (`MuiCssBaseline` `.ql-toolbar.ql-snow`) so each theme sets it. The rest of `App.css` (radii, padding) can stay.
  - `src/Components/PhotoCard.tsx:19`: polaroid border `rgba(0,0,0,0.2)`. It works on cream, so leave it. Optionally switch it to `theme.palette.divider`.
  - `src/Components/HomeworkCard.tsx:184`: menu drop-shadow. This is neutral, so leave it.
  - YouTube icons `#FF0000` in `ResourceCard.tsx`, `HomeworkCard.tsx`, `ResourcePickerDialog.tsx`, `InsertMediaDialog.tsx`, `TeacherResourcesPage.tsx` and `ResourceDetailsPage.tsx`. **Leave them.** That's YouTube's brand red, not the site theme.
  - `src/pages/scheduling/AvailabilityCalendarTest.tsx:19` duplicates the dark palette by hand ("Mirror CustomThemeProvider's theme settings"). Update it to import the theme factory instead.
- **Fonts**
  - Roboto comes from `@fontsource/roboto` (^4.5.8), imported in `src/index.tsx:8-11` at weights 300, 400, 500 and 700. There are no Google Fonts `<link>`s, so the self-hosted approach should continue.
  - `warm` adds `@fontsource/cormorant-garamond` (500, 600, 500-italic) and `@fontsource/nunito-sans` (400, 600, 700). Both themes' fonts get bundled, which is a small extra download, but only the active theme's fonts are actually used.
- **`h6` is used in 10 places**, including the AppBar page title (`DrawerAppBar.tsx:76-81`) and CardHeaders on the teacher pages. Cormorant Garamond is light at small sizes, so in `warm` **only h1–h5 are serif**. `h6`, the subtitles, body text and buttons use Nunito Sans.
- **`CustomThemeProvider` sits at `src/App.tsx:49`.** Read `?theme=` from `window.location.search` rather than `useSearchParams`, so the provider doesn't depend on the router. `LocaleProvider.tsx:194-196` does the same for `?hl=` with `useSearchParams` and is the model for naming and behaviour.
- **The theme is global**, so `warm` will also restyle the teacher and student pages: students, homework, the Quill editor, resources, scheduling calendars and dialogs.
  - That's intended (confirmed 2026-10-12), but those pages are card- and accordion-heavy and need a dedicated review pass (M5).

---

## Design tokens: `warm`

Values come from the Direction A mock. All text/background pairs below meet 4.5:1 or better. White on `#B0501F` is about 5.3:1.

### Light

| Token | Value | Notes |
|---|---|---|
| `background.default` | `#FAF5EE` | cream page |
| `background.paper` | `#FFFFFF` | cards, dialogs, menus |
| tinted section (custom) | `#F3E6D8` | optional `palette.warm.sand`, for later steps |
| `text.primary` | `#2A1D16` | dark brown |
| `text.secondary` | `#5A4436` | |
| `primary.main` | `#B0501F` | terracotta; dark `#8E3B1A`, light `#C9774A`, contrastText `#FFFFFF` |
| `secondary.main` | `#1C2133` | deep navy; contrastText `#F5EDE3` (FabCreate turns navy instead of purple) |
| `divider` | `rgba(42,29,22,0.12)` | |
| `success` / `error` / `warning` / `info` | MUI defaults | keep semantic meaning; revisit in M5 if they clash |

### Dark (not in the mock; proposed)

| Token | Value |
|---|---|
| `background.default` | `#14182A` (deep navy) |
| `background.paper` | `#1C2133` |
| `text.primary` | `#F2EAE0` |
| `text.secondary` | `#C2B5A6` |
| `primary.main` | `#E9A774` (soft terracotta; contrastText `#1C2133`) |
| `secondary.main` | `#F2EAE0` |
| `divider` | `rgba(242,234,224,0.12)` |

### Typography

- `fontFamily` (body): `'"Nunito Sans", "Helvetica", "Arial", sans-serif'`
- h1–h5: `'"Cormorant Garamond", Georgia, serif'`, weight 500. h4 and h5 are a little larger than MUI's defaults to make up for the serif's small x-height.
- h6, subtitle1/2, body1/2: Nunito Sans.
- `button`: `textTransform: 'none'`, `fontWeight: 700`, `letterSpacing: 0`.
- `overline`: Nunito Sans 700, `letterSpacing: '0.16em'` (the mock's small-caps "eyebrow" labels).

### Shape and component overrides

- `shape.borderRadius: 12`.
- `MuiButton`: `borderRadius: 999` (pill), `boxShadow: 'none'` on contained buttons.
- `MuiCard`: keep `zIndex: 0` and `backgroundImage: 'none'`. Use a very soft warm shadow, e.g. `0 1px 2px rgba(42,29,22,0.06), 0 4px 16px rgba(42,29,22,0.06)` in light mode and a darker equivalent in dark mode. The fallback, if it doesn't work out, is `boxShadow: 'none'` + `border: 1px solid divider`.
- `MuiAppBar`: `backgroundColor: background.default`, `color: text.primary`, `boxShadow: 'none'`, `borderBottom: 1px solid divider`. The page title stays `h6`, which is Nunito Sans in `warm`. The wordmark styling belongs to step 2.
- `MuiAccordion`: same soft shadow as Card. `/students` and `/subjects` use `Accordion defaultExpanded`.
- `MuiPopover`, `MuiMenu`: keep an elevated shadow, tinted brown instead of grey.
- `MuiAlert` (announcement banner): stays `severity="info"` for now and is restyled in step 2.
- `MuiCssBaseline`: the same reset as today, plus `.ql-toolbar.ql-snow { background: <theme toolbar colour> }`. `warm` light uses `#F3E6D8`. `warm` dark uses `#232842`. `classic` keeps `#dfe3e8`.

`classic` keeps today's exact values: `GREY` and `shadows` in light, `#2B2D3E` / `#343E59` in dark, radius 8, Roboto, and the same Card and Popover overrides.

---

## File layout

```
src/theme/
  CustomThemeProvider.tsx   # picks a theme; owns mode detection + ?theme= override
  themeName.ts              # ThemeName type, ACTIVE_THEME constant, resolveThemeName()
  classic.ts                # createClassicTheme(mode): Theme  — today's theme, moved verbatim
  warm.ts                   # createWarmTheme(mode): Theme
  palette.ts                # unchanged (GREY ramp, used by classic)
  shadows.ts                # unchanged (used by classic)
```

`themeName.ts`:

```ts
export type ThemeName = 'classic' | 'warm'

/** Flip this to change the site's theme for everyone. */
export const ACTIVE_THEME: ThemeName = 'classic'

const STORAGE_KEY = 'themeOverride'

/** `?theme=warm` / `?theme=classic` overrides ACTIVE_THEME for this browser session. */
export function resolveThemeName(): ThemeName { /* read URL, then sessionStorage, else ACTIVE_THEME */ }
```

- The override is saved in `sessionStorage`, so it survives client-side navigation (react-router may drop the query string) but not a new tab. Every read and write is wrapped in try/catch, the same way the existing localStorage usage is.
- `?theme=` with any other value is ignored. There is no UI toggle. A switch on the page could come later, but that's out of scope here.

---

## Implementation milestones

Each milestone ends with `npm run lint` passing, and `npx prettier --write` run only on touched files. Then **stop for the user's review in `npm start`.**

### M1: Extract `classic`, add the switch (no visual change)

- Move today's theme building into `classic.ts` and add `themeName.ts`.
- `CustomThemeProvider` calls `resolveThemeName()` and the matching factory.
- `warm.ts` is a stub that returns `classic` for now.
- Point `AvailabilityCalendarTest.tsx` at the factory.
- Unit test (`src/theme/themeName.test.ts`): URL param wins, then sessionStorage, then the constant, and an invalid value is ignored.
- **Review:** the site looks exactly as it does today, and `?theme=warm` is accepted without errors.

### M2: `warm` palette and typography (light)

- Install the two `@fontsource` packages and import their weights in `src/index.tsx`.
- Implement the light palette and typography in `warm.ts`.
- **Review:** `localhost:3000/?theme=warm` shows cream, terracotta and the serif headings on Home, Lessons, CV, Contact and News.

### M3: Component overrides and hard-coded colour fixes

- Add the AppBar, Button, Card, Accordion, Popover and Quill toolbar overrides.
- Change `#fff` to `inherit` in `DrawerAppBar.tsx` and `UserPopover.tsx`.
- Move the Quill toolbar colour out of `App.css`.
- **Review:** the header reads correctly on cream, buttons are pills, the drawer and menus work, and the language and user popovers look right. `?theme=classic` is still identical to production.

### M4: Dark mode for `warm`

- Implement the dark palette.
- **Review:** set the OS to dark and check the public pages plus one teacher page.

### M5: Teacher and student pages pass

- Walk through `/students`, `/subjects`, `/homework/...` (EditorCard/Quill, HomeworkCard menu, table of contents), `/resources*` and `/scheduling*` (both calendars), plus dialogs (Add student, Insert media, Resource picker), in light and dark.
- Fix anything that clashes, such as status colours, calendar event colours, dense lists and border weight.
- **Review:** the user signs in as teacher and as student.

### M6: Preview hand-off

- Deploy with `ACTIVE_THEME = 'classic'`.
- Send Susanna `https://vioara-cu-susanna.ro/?theme=warm` (and `&hl=ro`).
- Once she approves, flip `ACTIVE_THEME` to `'warm'` in a one-line commit: `feat(theme): switch site to warm classical theme`.

Reverting later means changing that one line. `classic.ts` stays in the codebase until we decide to remove it.

---

## Decisions (2026-10-12)

1. **Scope:** all pages and components get the theme, teacher and student pages included. No nested `ThemeProvider`.
2. **Dark palette:** approved as listed above.
3. **Cards:** a very soft warm shadow, not a border. If it doesn't work out on the card-heavy teacher pages, switch to the border treatment in M3 or M5.

---

## Verification

1. `npm test`: the `themeName` tests pass.
2. `npm run lint` is clean.
3. With `ACTIVE_THEME = 'classic'` and no parameter, every page is visually identical to production. Compare Home, Contact and Students against the canvas replicas.
4. `?theme=warm` applies the warm theme. Navigating between pages keeps it. Opening a new tab without the parameter falls back to `classic`.
5. `?theme=classic` returns to classic.
6. Light and dark (OS setting) both render correctly in each theme.
7. Teacher flows still work in `warm`: create a homework draft, publish it, open the menus, and open the scheduling calendars.
