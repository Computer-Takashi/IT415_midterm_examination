# Campus Corner — IT415 Touchscreen POS Kiosk

A complete self-service campus food outlet kiosk. Customers select products, review their order, choose Cash, QR Payment or Credit/Debit Card, complete a simulated payment, view a receipt and start a fresh transaction.

**All payments are simulations. No money moves and no card details are collected.**

## Setup and run

Install Node.js 20 or newer. No packages, database, API keys or internet connection are needed to run the app.

```sh
git clone https://github.com/Computer-Takashi/IT415_midterm_examination.git
cd IT415_midterm_examination
node server.mjs
```

Open **http://localhost:4150**. `npm start` is an equivalent shortcut if npm is available. Stop with Ctrl+C. Do not open index.html using file://; JavaScript modules require the local server. The server binds only to the local computer. In PowerShell, set `$env:PORT = '4151'` before starting to choose another port.

## Tests

```sh
node --test tests/model.test.mjs
```

`npm test` runs the same suite. In a restricted environment that blocks subprocess creation, recent Node.js versions also support `node --test --test-isolation=none tests/model.test.mjs`.

The 27 tests cover required prices, arithmetic, empty orders, backward navigation, invalid/insufficient payments, exact/extra cash, QR/card payments, duplicate-payment guards, immutable receipts and reset. See [ACCEPTANCE.md](ACCEPTANCE.md) for browser evidence and reference limitations.

## Files and technologies

```text
public/
  index.html        Page shell, metadata and accessible regions
  styles.css        Touchscreen, responsive and print styles
  model.js          Catalog, integer money calculations and state machine
  app.js            Screen rendering, events, keypad and simulation
tests/
  model.test.mjs    27 automated transaction tests
server.mjs          Dependency-free Node.js static server
package.json        Optional npm shortcuts
README.md           Setup and architecture
ACCEPTANCE.md       Requirement verification
```

Semantic HTML, CSS Grid/Flexbox and plain JavaScript ES modules power the interface. Node.js serves local files and runs tests; there is no backend transaction service.

## Architecture and flow

`Kiosk` in model.js owns transaction state. app.js calls its methods and renders the current screen. Calculations are separate from rendering so a student can test and explain them independently.

```text
items → review → method → cash / qr / card → processing → success → receipt
  ↑        ↑       ↑                                                 |
  └─ Back ─┘       └─ Back from payment                               |
  └──────────────────── New Transaction ──────────────────────────────┘
```

- Prices use integer centavos, avoiding floating-point currency errors.
- A Map stores product IDs and quantities. Subtotal, total and count are derived from the cart. Quantity zero removes a product; negative quantities are prevented. A 999-unit limit per product prevents accidental runaway tapping.
- Cash accepts plain decimal values with up to two decimal places, up to ₱999,999.99. Blank, negative, malformed, excessive-precision and insufficient values cannot create receipts.
- The keypad, exact-amount and denomination shortcuts minimize typing. Denomination shortcuts set the amount; they do not add bills cumulatively.
- QR has an explicitly labeled placeholder. Card displays tap/insert/swipe instructions. Both pay the exact total with zero change.
- A valid payment captures an immutable order snapshot and shows a 1.2-second processing state. Editing, going backward and duplicate payment attempts are blocked while processing.
- Success creates a UUID reference and timestamp. The receipt reads the captured snapshot, ensuring its values match the payment.
- New Transaction clears the cart, method, pending payment, receipt, cash input, errors and feedback, returning to item selection.
- Optional printing opens the browser print dialog. Print CSS hides kiosk controls.

## Storage and limitations

All customer state lives **only in the current tab's memory**. There are no cookies, localStorage, sessionStorage, database or retained transaction records. Refreshing, closing the tab or choosing New Transaction clears the data. Tabs have independent carts. Save/print a receipt before reset if it is needed later.

The QR graphic is not scannable. Payment Successful indicates a simulation only. Currency is Philippine pesos; timestamps use the browser's local time. UUID generation requires a modern browser on localhost or HTTPS.

An optional, feature-detected read-only WebMCP tool (`read_kiosk_order`) returns the same cart and totals in compatible browsers. It cannot initiate payment and is not needed by standard browsers.

## Instructor demonstration

1. Add Coffee twice and Sandwich once: 3 items, coffee subtotal ₱90, total ₱140.
2. Review, then return to items: quantities remain unchanged.
3. Choose Cash and submit ₱100: Insufficient Payment appears, with no receipt.
4. Pay ₱200: processing completes with ₱60 change; inspect the receipt.
5. Start a new transaction: empty cart and ₱0 total.
6. Repeat with QR and Card: paid equals total, zero change and different references.

## Design references and Git history

The Sample UI and original Acceptance Checklist DOCX were referenced but not attached. This implementation follows the detailed pasted requirements with an original touchscreen design. Exact visual matching and any additional requirements in the missing files remain unverified.

Real local development stages cover setup, catalog/cart, a Windows server-path fix, payment/receipt implementation, tests, focus improvements, source readability and documentation. Authentication initially blocked command-line pushes, so source was published through the user's signed-in GitHub browser account. GitHub commits reflect those actual web publication steps; no commits were backdated to imply additional development sessions.
