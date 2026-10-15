# LedgerFlow — Design Direction

> Authored by the product owner via a direction questionnaire; transcribed by the
> agent (antislop R-37: the user authors direction, the agent only formats).
> This file holds design fields only. `docs/superpowers/plans/2026-10-15-ledgerflow-frontend.md`
> is the build plan; antislop is the filter applied on top of this direction.

## Identity

**LedgerFlow** — a transaction ledger for finance operators.

The audience is a finance operator who opens this tool as part of a working day.
The interface exists to let them see status and money clearly and act on it
without hesitation.

## Personality

**Confident fintech.**

Modern and assured. Sharper edges than a spreadsheet, a confident use of the one
accent, and a feel of a product rather than a form. The confidence comes from
clarity and deliberate hierarchy, not from decoration.

## Palette

- **Base:** neutral grays. Quiet surfaces that let numbers and status carry the
  meaning.
- **Brand accent:** one calm accent, a deep slate blue. Used sparingly, for the
  single most important action or state on a screen. Not spread across buttons,
  icons, borders, and backgrounds at once.
- **Status colors (required, functional):** distinct, accessible colors for
  `PENDING`, `PROCESSING`, `COMPLETED`, and `FAILED`. These are the primary
  carriers of meaning in the ledger and must be readable as text, not color
  alone.

## Typography

- **UI:** a humanist sans.
- **Numbers:** a monospace with **tabular figures**, used for all amounts and
  totals so columns of money align and can be scanned and compared.

Reason (antislop R-16 requires a stated reason, and the AI-default picks Inter /
Geist / Space Grotesk are avoided): the product's character is a ledger. Tabular
figures in a mono make amounts line up and read as data; the humanist sans keeps
labels and sentences warm enough to read at length. Final font names are chosen
at implementation time and recorded in the plan's Task 2, meeting this brief.

## Mood

Assured, calm-but-alive. The interface is not sterile: it has a clear focal
point per screen, deliberate contrast, and a rhythm that is consistent with
occasional breaks rather than uniform grids everywhere.

## Dials

**Dial: ENERGY 3 / RHYTHM 2 / MOTION 2**

- **ENERGY 3** — the design says hello clearly. One confident focal point per
  screen, a strong accent used at the key moment.
- **RHYTHM 2** — largely consistent section structure with a few deliberate
  breaks; not a uniform grid, not an asymmetric collage.
- **MOTION 2** — considered transitions and state changes (not hover-only, not
  choreography). Motion must have a reason.

## Non-negotiables from the plan (constraints, not style choices)

- Money is rendered from the API's **string** amounts; never parse to a float.
- Never display a currency total that mixes currencies.
- No fabricated data anywhere. Empty states say why they are empty and what to
  do next.
- Every interactive element works, or it does not exist.
- Keyboard navigable with a visible focus state.
