// All prices are integer centavos. No customer data is persisted.
export const PRODUCTS = Object.freeze([
  { id: 'coffee', name: 'Coffee', price: 4500, icon: '☕', note: 'Your everyday pick-me-up', category: 'DRINKS', color: 'peach' },
  { id: 'sandwich', name: 'Sandwich', price: 5000, icon: '🥪', note: 'A little break, a good bite', category: 'FOOD', color: 'yellow' },
  { id: 'soft-drink', name: 'Soft Drink', price: 3500, icon: '🥤', note: 'Cool, crisp & refreshing', category: 'DRINKS', color: 'pink' },
  { id: 'cookies', name: 'Cookies', price: 2500, icon: '🍪', note: 'A sweet study companion', category: 'SNACKS', color: 'sand' },
  { id: 'water', name: 'Bottled Water', price: 2000, icon: '💧', note: 'Keep your day flowing', category: 'DRINKS', color: 'blue' },
  { id: 'chocolate', name: 'Chocolate', price: 2500, icon: '🍫', note: 'Make your break sweeter', category: 'SNACKS', color: 'purple' },
  { id: 'cake', name: 'cake', price: 2500, icon: '🎂', note: 'Make your break sweeter', category: 'SNACKS', color: 'purple' },
  { id: 'cake', name: 'mooncake', price: 2500, icon: '🥮', note: 'Make your break sweeter', category: 'SNACKS', color: 'purple' }
].map(Object.freeze));

export const money = cents => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);

export function parseCash(value) {
  const text = String(value).trim();
  if (!text) throw new Error('Enter the amount paid.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter a valid positive amount with up to two decimal places.');
  const [pesos, centavos = ''] = text.split('.');
  const amount = Number(pesos) * 100 + Number(centavos.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 99999999) throw new Error('Amount must be no more than ₱999,999.99.');
  return amount;
}

export class Kiosk {
  constructor() { this.reset(); }
  reset() {
    this.cart = new Map();
    this.stage = 'items';
    this.method = null;
    this.receipt = null;
    this.pending = null;
  }
  get lines() {
    return PRODUCTS.filter(p => this.cart.has(p.id)).map(p => ({ ...p, quantity: this.cart.get(p.id), subtotal: p.price * this.cart.get(p.id) }));
  }
  get total() { return this.lines.reduce((sum, line) => sum + line.subtotal, 0); }
  get count() { return this.lines.reduce((sum, line) => sum + line.quantity, 0); }
  change(id, delta) {
    if (this.stage !== 'items') throw new Error('Return to item selection to edit your order.');
    if (!PRODUCTS.some(p => p.id === id) || !Number.isInteger(delta)) throw new Error('Invalid product or quantity.');
    const quantity = Math.max(0, (this.cart.get(id) || 0) + delta);
    if (quantity > 999) throw new Error('Maximum quantity is 999 per product.');
    if (quantity === 0) this.cart.delete(id);
    else this.cart.set(id, quantity);
    return quantity;
  }
  remove(id) { return this.change(id, -(this.cart.get(id) || 0)); }
  review() {
    if (this.stage !== 'items' || this.count === 0) throw new Error('Add at least one product before continuing.');
    this.stage = 'review';
  }
  paymentMethods() {
    if (this.stage !== 'review' || !this.count) throw new Error('Review your order first.');
    this.stage = 'method';
  }
  chooseMethod(method) {
    if (this.stage !== 'method' || !['Cash', 'QR Payment', 'Credit/Debit Card'].includes(method)) throw new Error('Choose a valid payment method.');
    this.method = method;
    this.stage = { Cash: 'cash', 'QR Payment': 'qr', 'Credit/Debit Card': 'card' }[method];
  }
  back() {
    const previous = { review: 'items', method: 'review', cash: 'method', qr: 'method', card: 'method' }[this.stage];
    if (!previous) throw new Error('This transaction cannot go back.');
    this.stage = previous;
    this.method = null;
  }
  beginPayment(cashInput = '') {
    if (!['cash', 'qr', 'card'].includes(this.stage) || !this.count) throw new Error('Choose a payment method for your order.');
    const paid = this.stage === 'cash' ? parseCash(cashInput) : this.total;
    if (paid < this.total) throw new Error(`Insufficient Payment. Add ${money(this.total - paid)} to continue.`);
    // Capture the confirmed order once. No edits or duplicate payments while processing.
    this.pending = Object.freeze({
      requestId: crypto.randomUUID(),
      lines: Object.freeze(this.lines.map(line => Object.freeze({ ...line }))),
      total: this.total, count: this.count, method: this.method, paid, change: paid - this.total
    });
    this.stage = 'processing';
  }
  finishPayment(savedReceipt = null) {
    if (this.stage !== 'processing' || !this.pending) throw new Error('No valid payment is processing.');
    if (savedReceipt) {
      const matches = ['total', 'count', 'method', 'paid', 'change'].every(key => savedReceipt[key] === this.pending[key]);
      const linesMatch = Array.isArray(savedReceipt.lines) && savedReceipt.lines.length === this.pending.lines.length &&
        new Set(savedReceipt.lines.map(line => line.id)).size === this.pending.lines.length &&
        savedReceipt.lines.every(line => this.pending.lines.some(expected => ['id','name','quantity','price','subtotal'].every(key => line[key] === expected[key])));
      if (!matches || !linesMatch || !/^CC-[A-F0-9-]{36}$/.test(savedReceipt.reference) ||
          !Number.isFinite(Date.parse(savedReceipt.date)) || savedReceipt.status !== 'Payment Successful') {
        throw new Error('The saved receipt does not match this order. Retry confirmation.');
      }
    }
    this.receipt = Object.freeze({ ...this.pending,
      reference: savedReceipt?.reference || `CC-${crypto.randomUUID().toUpperCase()}`,
      date: savedReceipt?.date || new Date().toISOString(), status: 'Payment Successful'
    });
    this.pending = null;
    this.stage = 'success';
    return this.receipt;
  }
  paymentFailed() {
    if (this.stage !== 'processing' || !this.pending) throw new Error('No payment to retry.');
    this.stage = 'payment-error';
  }
  retryPayment() {
    if (this.stage !== 'payment-error' || !this.pending) throw new Error('No pending payment.');
    this.stage = 'processing';
  }
  viewReceipt() {
    if (this.stage !== 'success' || !this.receipt) throw new Error('Complete a valid payment before viewing a receipt.');
    this.stage = 'receipt';
  }
}
