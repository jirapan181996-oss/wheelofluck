# Agents Guide — Prize Wheel Studio

## What this project is

A zero-dependency, single-page browser app that renders an interactive spinning prize wheel on an HTML5 canvas. No build step, no framework, no npm. Open `index.html` directly in a browser.

## File map

| File | Role |
|---|---|
| `index.html` | Full markup — canvas, sidebar controls, admin `<dialog>` |
| `styles.css` | All styling via CSS custom properties; responsive at 980 px and 540 px |
| `script.js` | All application logic; runs in one flat module-free script |

## Architecture

Everything lives in `script.js` as module-level variables and plain functions. There is no framework, no component abstraction, and no state manager. DOM elements are queried once at the top and held in `const` variables for the rest of the session.

### Core state variables

| Variable | Type | Purpose |
|---|---|---|
| `allEntries` | `string[]` | Master list from the last "Update wheel" action; used by Reset |
| `entries` | `string[]` | Active list the wheel currently shows; may shrink when "Remove winner" is on |
| `rotation` | `number` | Current wheel angle in radians |
| `isSpinning` | `boolean` | Guards against double-spin |
| `history` | `string[]` | Last 12 winners, newest first |
| `landingOrderText` | `string` | Cached raw text of the landing-order textarea |
| `landingOrderPosition` | `number` | How far through the landing-order sequence we are |
| `guaranteedTargetName` | `string` | Remembers the last chosen guaranteed target across spins |

### Spin modes (selected via `#spinMode`)

- **`random`** — picks a random index each spin.
- **`guaranteed`** — always lands on `guaranteedTargetName`; if the name was removed from `entries`, `ensureEntryAvailable` re-adds it before the spin.
- **`landing-order`** — reads `#landingOrderInput` as a newline/comma list and advances through it sequentially. Resets the position to 0 whenever the textarea content changes.

### Rendering pipeline

`drawWheel()` is the only render function. It runs:
1. `clearRect` the whole canvas.
2. For each entry: draw a filled arc segment, stroke the white divider, then draw the label with `ctx.fillText`.
3. Draw the outer white ring and the center hub circle.

`drawWheel` is called on every animation frame during a spin and also synchronously whenever entries or rotation change outside a spin.

### Spin animation

`spinWheel()` computes `finalRotation` as:

```
startRotation + (fullTurns × 2π) + forwardDelta
```

where `forwardDelta` is the shortest forward arc from the current normalized angle to the target segment. An `easeOutCubic` is applied over the configured `spinDuration`. On completion, `rotation` is normalized back to `[0, 2π)` before calling `revealWinner`.

### Angle math

The pointer sits at the top (12 o'clock). Segment 0 starts at `-π/2 + rotation`. To find which segment the pointer points at:

```js
selectedIndexFromRotation(angle):
  normalized = normalizeAngle(-angle)   // negate because CSS rotates clockwise
  index = floor(normalized / segment) % entries.length
```

`targetRotationForIndex(index)` inverts this to compute the rotation value that puts a given segment under the pointer, with a small random jitter so the wheel never lands on a segment boundary.

## Key functions

| Function | What it does |
|---|---|
| `parseEntries(value)` | Splits on newline or comma, trims, filters blanks, caps at 80 |
| `syncEntryControls()` | Syncs `#entriesInput` textarea and `#targetWinner` `<select>` from `entries` |
| `labelFontSize(label, segment)` | Returns font size scaled down for long names and crowded wheels |
| `chooseTargetIndex()` | Dispatches among the three spin modes and returns a target index |
| `ensureEntryAvailable(name)` | Finds a name in `entries` (case-insensitive); pushes it if missing |
| `revealWinner(index)` | Updates winner display, prepends to history, optionally splices entry out |
| `applyEntryText()` | Reads `#entriesInput`, validates ≥2 entries, resets wheel |
| `shuffleEntries()` | Fisher-Yates shuffle on `entries` in place, redraws |

## Admin panel

Hidden behind the gear icon (`#adminToggle`), opened as a native `<dialog>`. Contains:
- **Spin mode** select
- **Guaranteed landing** select (populates from current `entries`)
- **Spin time** range (3–9 s, step 0.5)
- **Extra revolutions** number (4–14)
- **Landing order** textarea

The dialog uses `method="dialog"` so the close button (`value="close"`) dismisses it natively without JavaScript.

## Constraints and gotchas

- **Minimum 2 entries** — `spinWheel` and `applyEntryText` both guard against fewer.
- **Maximum 80 entries** — enforced in `parseEntries`.
- **History cap** — kept at 12 entries via `history.slice(0, 12)`.
- **Canvas resolution** — fixed at 900×900 px in HTML; CSS scales it to fill the `.wheel-wrap`. Do not change the HTML `width`/`height` without also rechecking `drawWheel` radius math.
- **No persistence** — state lives only in JS memory. Refreshing the page resets everything to `defaultEntries`.
- **No external fonts** — Inter is declared in the font stack but not loaded; the browser falls back to `system-ui`.
- **`guaranteedTargetName` sync** — updating `#targetWinner` in the admin panel fires `guaranteedTargetName = entries[Number(targetWinner.value)]`. If you programmatically change `entries` without calling `syncEntryControls`, `targetWinner.value` can become stale.

## Adding a feature — checklist

1. If the feature changes `entries`, call `syncEntryControls()` and `drawWheel()` afterward.
2. If it adds a new spin mode, add a branch in `chooseTargetIndex()` and an `<option>` in `#spinMode`.
3. If it needs persistent config, you'll need to wire `localStorage` — nothing currently survives a refresh.
4. If it changes the canvas size or coordinate system, audit `drawWheel`, `selectedIndexFromRotation`, and `targetRotationForIndex` together — they share assumptions about `cx`, `cy`, and `radius`.
