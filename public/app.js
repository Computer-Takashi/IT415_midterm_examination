import { Kiosk, PRODUCTS, money, parseCash } from './model.js';

const kiosk = new Kiosk();
const app = document.querySelector('#app');
let toastTimer;
let cashInput = '';
let paymentError = '';
function notify(message) {
  const feedback = document.querySelector('#feedback');
  clearTimeout(toastTimer);
  feedback.textContent = message;
  feedback.classList.add('visible');
  toastTimer = setTimeout(() => feedback.classList.remove('visible'), 2600);
}
function cartView() {
  return `<aside class="cart panel"><div class="section-heading"><h2>Your order</h2><span class="count">${kiosk.count} items</span></div>
    <div class="cart-lines">${kiosk.count ? kiosk.lines.map(line => `<article class="cart-line"><div class="cart-line-heading"><strong>${line.name}</strong><button class="text-button" data-action="remove" data-id="${line.id}" aria-label="Remove ${line.name}">Remove</button></div><p>${money(line.price)} each</p><div class="quantity-row"><div class="quantity"><button data-action="decrease" data-id="${line.id}" aria-label="Decrease ${line.name}">−</button><span aria-label="${line.name} quantity">${line.quantity}</span><button data-action="add" data-id="${line.id}" aria-label="Increase ${line.name}">+</button></div><strong>${money(line.subtotal)}</strong></div></article>`).join('') : '<div class="empty-cart"><span aria-hidden="true">＋</span><h3>Something good starts here</h3><p>Tap a product to add it to your order.</p></div>'}</div>
    <div class="cart-bottom"><div class="total-row"><span>Total</span><strong>${money(kiosk.total)}</strong></div><button class="primary full" data-action="review" ${kiosk.count ? '' : 'disabled'}>Review order <span>(${kiosk.count})</span></button><p class="hint">You can check your order before paying.</p></div></aside>`;
}
function heading(title, subtitle, eyebrow = 'YOUR CAMPUS PIT STOP') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p>${subtitle}</p></div></div>`;
}
function itemView() {
  return `${heading('What sounds good?', 'Pick your favorites. We’ll take care of the total.', 'A BREAK WELL SPENT')}<div class="shop-layout"><section class="products" aria-label="Products">${PRODUCTS.map(p => `<button class="product-card" data-action="add" data-id="${p.id}" aria-label="Add ${p.name}, ${money(p.price)}"><div class="product-art ${p.color}"><span class="product-category">${p.category}</span><span class="product-icon" aria-hidden="true">${p.icon}</span><span class="add-circle" aria-hidden="true">+</span></div><div class="product-details"><h2>${p.name}</h2><p>${p.note}</p><strong>${money(p.price)}</strong></div></button>`).join('')}</section>${cartView()}</div>`;
}
// This table is shared by review and receipt, so line values cannot diverge.
function orderTable(lines) {
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Product</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Subtotal</th></tr></thead><tbody>${lines.map(line => `<tr><th scope="row">${line.name}</th><td>${line.quantity}</td><td>${money(line.price)}</td><td>${money(line.subtotal)}</td></tr>`).join('')}</tbody></table></div>`;
}
function backButton(label = 'Back') { return `<button class="secondary" data-action="back">${label}</button>`; }
function reviewView() {
  return `${heading('A good choice. Or six.', 'Check your order before moving to payment.', 'REVIEW YOUR ORDER')}<section class="panel review-panel">${orderTable(kiosk.lines)}<div class="review-total"><span>${kiosk.count} ${kiosk.count === 1 ? 'item' : 'items'} in your order</span><div class="total-row"><span>Total amount</span><strong>${money(kiosk.total)}</strong></div></div><div class="actions">${backButton('Back to items')}<button class="primary" data-action="methods">Continue to Payment</button></div></section>`;
}
function methodsView() {
  return `${heading('How would you like to pay?', 'Choose a payment method to continue.', 'ONE MORE STEP')}<div class="due-banner"><span>Amount due <small>${kiosk.count} items</small></span><strong>${money(kiosk.total)}</strong></div><section class="payment-options" aria-label="Payment methods">${[
    ['Cash', '₱', 'Enter the amount paid', 'cash'], ['QR Payment', '▦', 'Scan and confirm payment', 'qr'], ['Credit/Debit Card', '▰', 'Tap, insert, or swipe', 'card']
  ].map(([method, icon, hint, value]) => `<button class="payment-option panel" data-action="method" data-method="${value}"><span class="method-icon" aria-hidden="true">${icon}</span><h2>${method}</h2><p>${hint}</p><span class="method-select">Select payment</span></button>`).join('')}</section><div class="actions">${backButton('Back to review')}</div>`;
}
function cashView() {
  return `${heading('Pay with cash', 'Enter the amount you are paying, then confirm.', 'CASH PAYMENT')}<section class="panel payment-panel"><div class="due-banner"><span>Transaction total</span><strong>${money(kiosk.total)}</strong></div><label for="cash-input">Amount paid (₱)</label><input id="cash-input" inputmode="decimal" autocomplete="off" placeholder="0.00" aria-describedby="cash-help payment-error" maxlength="15"><p id="cash-help" class="field-hint">Use the keypad or type an amount.</p><div class="quick-cash"><button class="secondary" data-action="exact">Exact amount</button>${[100, 200, 500, 1000].map(value => `<button class="secondary" data-action="tender" data-value="${value}">₱${value}</button>`).join('')}</div><div class="keypad" aria-label="Cash keypad">${['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(key => `<button data-action="key" data-key="${key}" aria-label="${key === '⌫' ? 'Backspace' : key === '.' ? 'Decimal point' : key}">${key}</button>`).join('')}<button class="clear-key" data-action="clear">Clear amount</button></div><div id="cash-preview" class="cash-preview" aria-live="polite"></div><p id="payment-error" class="error" role="alert"></p><div class="actions">${backButton()}<button class="primary" data-action="pay">Confirm cash payment</button></div></section>`;
}
function electronicView() {
  const qr = kiosk.stage === 'qr';
  return `${heading(qr ? 'Scan. Confirm. All set.' : 'Ready when you are.', qr ? 'Use a supported payment app, such as GCash or Maya.' : 'Please tap, insert, or swipe your card.', qr ? 'QR PAYMENT' : 'CREDIT / DEBIT CARD')}<section class="panel payment-panel centered"><div class="due-banner"><span>Amount to pay</span><strong>${money(kiosk.total)}</strong></div>${qr ? '<div class="qr-placeholder" role="img" aria-label="Demo QR placeholder. Not a scannable payment code."><span aria-hidden="true">▦</span><strong>DEMO QR PLACEHOLDER</strong><small>Not a scannable payment code</small></div><p>This is a simulation. Select Confirm Payment to continue without transferring money.</p>' : '<div class="card-placeholder" aria-hidden="true">▰</div><p>This is a simulation. No card details are needed.</p>'}<div class="actions">${backButton()}<button class="primary" data-action="pay">${qr ? 'Confirm Payment' : 'Process Payment'}</button></div></section>`;
}
function processingView() {
  return `<section class="panel state-panel" role="status"><div class="spinner" aria-hidden="true"></div><p class="eyebrow">${kiosk.method.toUpperCase()}</p><h1 tabindex="-1">Processing payment…</h1><p>Please wait while we complete your simulated payment.</p><strong class="processing-total">${money(kiosk.pending.total)}</strong></section>`;
}
function paymentDetails(receipt) {
  return `<dl class="payment-details"><div><dt>Payment method</dt><dd>${receipt.method}</dd></div><div><dt>Transaction amount</dt><dd>${money(receipt.total)}</dd></div><div><dt>Amount paid</dt><dd>${money(receipt.paid)}</dd></div><div class="change-row"><dt>Change</dt><dd>${money(receipt.change)}</dd></div></dl>`;
}
function successView() {
  const receipt = kiosk.receipt;
  return `<section class="panel state-panel"><div class="success-icon" aria-hidden="true">✓</div><p class="eyebrow">YOU’RE ALL SET</p><h1 tabindex="-1">Payment Successful</h1><p>Thanks for stopping by Campus Corner.</p><div class="reference"><span>Transaction reference</span><strong>${receipt.reference}</strong></div>${paymentDetails(receipt)}<button class="primary full" data-action="receipt">View Receipt</button></section>`;
}
function receiptView() {
  const receipt = kiosk.receipt;
  return `<section class="panel receipt-panel"><div class="receipt-header"><p class="eyebrow">CAMPUS CORNER</p><h1 tabindex="-1">Your digital receipt</h1><span class="success-badge">✓ Payment Successful</span><p>Simulated transaction</p></div><div class="receipt-meta"><div><span>Transaction reference</span><strong>${receipt.reference}</strong></div><div><span>Date / time</span><strong>${new Date(receipt.date).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'medium' })}</strong></div></div>${orderTable(receipt.lines)}<div class="receipt-total"><span>${receipt.count} items · Total amount</span><strong>${money(receipt.total)}</strong></div>${paymentDetails(receipt)}<p class="receipt-thanks">A little break makes a better day.<br>Thank you for your order!</p><div class="actions receipt-actions"><button class="secondary" data-action="print">Print receipt</button><button class="primary" data-action="new">New Transaction</button></div></section>`;
}
function updateCashPreview() {
  const preview = document.querySelector('#cash-preview');
  const input = document.querySelector('#cash-input');
  if (!preview) return;
  input.value = cashInput;
  document.querySelector('#payment-error').textContent = paymentError;
  input.setAttribute('aria-invalid', paymentError ? 'true' : 'false');
  try {
    const paid = parseCash(cashInput);
    preview.textContent = paid < kiosk.total ? `Amount still due: ${money(kiosk.total - paid)}` : `Change: ${money(paid - kiosk.total)}`;
  } catch { preview.textContent = 'Change will appear when you enter a valid amount.'; }
}
function render(moveFocus = false) {
  const stageIndex = kiosk.stage === 'items' ? 0 : kiosk.stage === 'review' ? 1 : ['success', 'receipt'].includes(kiosk.stage) ? 3 : 2;
  document.querySelector('#progress').innerHTML = ['Choose items', 'Review order', 'Payment', 'Receipt'].map((name, i) => `<div class="step ${i === stageIndex ? 'active' : i < stageIndex ? 'done' : ''}" ${i === stageIndex ? 'aria-current="step"' : ''}><span>${i < stageIndex ? '✓' : i + 1}</span>${name}</div>`).join('');
  const views = { items: itemView, review: reviewView, method: methodsView, cash: cashView, qr: electronicView, card: electronicView, processing: processingView, success: successView, receipt: receiptView };
  app.innerHTML = views[kiosk.stage]();
  if (kiosk.stage === 'cash') updateCashPreview();
  if (moveFocus) { app.querySelector('h1')?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
async function pay() {
  try {
    kiosk.beginPayment(cashInput);
    paymentError = '';
    cashInput = '';
    render(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    kiosk.finishPayment();
    render(true);
  } catch (error) {
    paymentError = error.message;
    updateCashPreview();
    if (kiosk.stage !== 'cash') notify(error.message);
  }
}
app.addEventListener('input', event => {
  if (event.target.id === 'cash-input') {
    cashInput = event.target.value;
    paymentError = '';
    updateCashPreview();
  }
});
app.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (['add', 'decrease', 'remove'].includes(action)) {
      const name = PRODUCTS.find(p => p.id === id).name;
      const quantity = action === 'remove' ? kiosk.remove(id) : kiosk.change(id, action === 'add' ? 1 : -1);
      render();
      const replacement = [...app.querySelectorAll('button[data-action]')].find(b => b.dataset.action === action && b.dataset.id === id)
        || app.querySelector(`.product-card[data-id="${id}"]`);
      replacement?.focus({ preventScroll: true });
      notify(quantity ? `${name}: ${quantity} in your order` : `${name} removed from your order`);
      return;
    }
    if (action === 'key' || action === 'exact' || action === 'tender' || action === 'clear') {
      paymentError = '';
      if (action === 'clear') cashInput = '';
      else if (action === 'exact') cashInput = (kiosk.total / 100).toFixed(2);
      else if (action === 'tender') cashInput = button.dataset.value;
      else {
        const key = button.dataset.key;
        if (key === '⌫') cashInput = cashInput.slice(0, -1);
        else if (key === '.' && !cashInput.includes('.')) cashInput = (cashInput || '0') + '.';
        else if (key !== '.' && cashInput.length < 12 && (!cashInput.includes('.') || cashInput.split('.')[1].length < 2)) cashInput += key;
      }
      updateCashPreview();
      return;
    }
    if (action === 'review') kiosk.review();
    if (action === 'methods') kiosk.paymentMethods();
    if (action === 'method') kiosk.chooseMethod({ cash: 'Cash', qr: 'QR Payment', card: 'Credit/Debit Card' }[button.dataset.method]);
    if (action === 'back') { kiosk.back(); cashInput = ''; paymentError = ''; }
    if (action === 'pay') { await pay(); return; }
    if (action === 'receipt') kiosk.viewReceipt();
    if (action === 'print') { window.print(); return; }
    if (action === 'new') {
      kiosk.reset(); cashInput = ''; paymentError = '';
      clearTimeout(toastTimer);
      document.querySelector('#feedback').textContent = '';
      document.querySelector('#feedback').classList.remove('visible');
    }
    render(true);
  } catch (error) { notify(error.message); }
});
render();

// Optional read-only tool for browsers that implement WebMCP.
// It reads exactly the same in-memory values as the visible kiosk.
try {
  const registration = document.modelContext?.registerTool({
    name: 'read_kiosk_order', title: 'Read current kiosk order',
    description: 'Read the current stage, cart quantities and total in centavos. Does not initiate payment.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
      return { stage: kiosk.stage, lines: kiosk.lines.map(({ name, quantity, price, subtotal }) => ({ name, quantity, price, subtotal })), total: kiosk.total, count: kiosk.count };
    }
  });
  Promise.resolve(registration).catch(() => {});
} catch { /* Standard browsers may not implement this optional API. */ }
