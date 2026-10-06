# IT415 acceptance verification

Verified on 2026-10-06 against the detailed pasted assignment. The original DOCX checklist and Sample UI were not attached; verification against those unseen files is not claimed.

## Automated evidence

**27 passed, 0 failed:** `node --test --test-isolation=none tests/model.test.mjs`. Model/UI JavaScript syntax checks passed. The local server returns HTTP 200.

| Requirement | Result | Evidence |
| --- | --- | --- |
| Six products/prices | Pass | Catalog visible; exact-price test; all six total ₱200 |
| Add, +/− and remove | Pass | Browser actions verified; zero removes a line; negatives prevented |
| Subtotals, count and total | Pass | 2 coffees = ₱90; plus sandwich = ₱140, 3 items |
| Cart feedback | Pass | Live status messages for additions, quantity changes and removal |
| Empty order blocked | Pass | Disabled review button and state guards |
| Review fields | Pass | Product, quantity, unit price, subtotal, total and count verified |
| Back preserves cart | Pass | Browser review → items retains cart; tests cover all back stages |
| Three payment choices | Pass | Large Cash/QR/Card options and correct amount due |
| Cash keypad/calculations | Pass | Keypad 1-0-0 for ₱45 shows ₱55 change |
| Exact cash | Pass | Browser ₱140 payment for ₱140 yields zero change |
| Insufficient cash | Pass | ₱139.99 for ₱140 reports ₱0.01 short; cannot create receipt |
| Blank/invalid/negative cash | Pass | Browser blank/negative; tests include text, whitespace, exponent, NaN, precision and overflow |
| Extra cash | Pass | Test: ₱200.50 for ₱140 yields ₱60.50 |
| QR placeholder/instructions | Pass | Explicit non-scannable placeholder and supported-app instructions |
| QR totals | Pass | Browser ₱20 order pays ₱20 with ₱0 change |
| Card instructions/processing | Pass | Tap/insert/swipe instruction and Processing payment observed |
| Card totals | Pass | Browser ₱25 order pays ₱25 with ₱0 change |
| Success fields | Pass | Reference, method, amount, paid and change visible |
| Unique references | Pass | Distinct UUIDs across cash/QR/card; reset test verifies uniqueness |
| Guarded receipt creation | Pass | Invalid, duplicate and out-of-order payment calls rejected |
| Receipt fields | Pass | All required reference, timestamp, line, total and payment fields verified |
| New Transaction reset | Pass | Browser empty cart/₱0; tests verify all previous state cleared |
| Touchscreen/responsive UI | Pass | Large cards, 44px+ quantity controls, 56px primary buttons; desktop/mobile overflow checks |
| Maintainability | Pass | Separate model/UI/styles, no external packages, documented flow |
| Optional print | Implemented | Print action and CSS; physical printer output not tested |
| Sample UI match | Not verifiable | Sample UI was not attached |
| Original DOCX checklist | Not verifiable | Checklist was not attached |

Payments are simulations. No payment gateway or physical cash/card hardware is required or tested. State is transient by design.
