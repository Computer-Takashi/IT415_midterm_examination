import test from 'node:test';
import assert from 'node:assert/strict';
import { Kiosk, PRODUCTS, money, parseCash } from '../public/model.js';

function ready(method = 'Cash') {
  const kiosk = new Kiosk();
  kiosk.change('coffee', 2);
  kiosk.change('sandwich', 1);
  kiosk.review();
  kiosk.paymentMethods();
  kiosk.chooseMethod(method);
  return kiosk;
}

test('six required products and exact prices', () => {
  assert.deepEqual(PRODUCTS.map(p => [p.name, p.price]), [['Coffee',4500],['Sandwich',5000],['Soft Drink',3500],['Cookies',2500],['Bottled Water',2000],['Chocolate',2500]]);
});
test('cart calculates quantities, subtotals and total', () => {
  const kiosk = new Kiosk();
  kiosk.change('coffee', 2); kiosk.change('sandwich', 1);
  assert.equal(kiosk.lines[0].subtotal, 9000);
  assert.equal(kiosk.count, 3); assert.equal(kiosk.total, 14000);
  kiosk.change('coffee', -1); assert.equal(kiosk.total, 9500);
  kiosk.remove('sandwich'); assert.equal(kiosk.total, 4500);
  kiosk.change('coffee', -100); assert.equal(kiosk.count, 0);
  kiosk.change('coffee', -1); assert.equal(kiosk.total, 0);
});
test('all six products sum to ₱200', () => {
  const kiosk = new Kiosk(); PRODUCTS.forEach(p => kiosk.change(p.id, 1));
  assert.equal(kiosk.total, 20000); assert.equal(kiosk.count, 6);
});
test('unknown products, fractional deltas and oversized quantities rejected', () => {
  const kiosk = new Kiosk();
  assert.throws(() => kiosk.change('invalid', 1));
  assert.throws(() => kiosk.change('coffee', 0.5));
  assert.throws(() => kiosk.change('coffee', 1000));
  assert.equal(kiosk.total, 0);
});
test('empty order cannot enter review, payment, success or receipt', () => {
  const kiosk = new Kiosk();
  for (const action of [() => kiosk.review(), () => kiosk.paymentMethods(), () => kiosk.chooseMethod('Cash'), () => kiosk.beginPayment('100'), () => kiosk.finishPayment(), () => kiosk.viewReceipt()]) assert.throws(action);
  assert.equal(kiosk.receipt, null); assert.equal(kiosk.stage, 'items');
});
test('going backward preserves the cart and clears the method', () => {
  const kiosk = ready();
  for (const stage of ['method', 'review', 'items']) {
    kiosk.back(); assert.equal(kiosk.stage, stage);
    assert.equal(kiosk.count, 3); assert.equal(kiosk.total, 14000);
  }
  assert.equal(kiosk.method, null);
  kiosk.change('water', 1); assert.equal(kiosk.total, 16000);
});
test('cash parser converts decimal values without rounding errors', () => {
  assert.equal(parseCash(' 140.01 '), 14001);
  assert.equal(parseCash('00140.1'), 14010);
  assert.equal(parseCash('0'), 0);
  assert.equal(parseCash('999999.99'), 99999999);
  assert.match(money(4500), /45\.00/);
});
for (const value of ['', ' ', '-1', 'abc', 'NaN', 'Infinity', '1e5', '140.001', '1,000', '.5', '140.', '1000000', '999999999999999999']) {
  test(`invalid cash ${JSON.stringify(value)} creates no transaction`, () => {
    const kiosk = ready();
    assert.throws(() => kiosk.beginPayment(value));
    assert.equal(kiosk.stage, 'cash'); assert.equal(kiosk.receipt, null); assert.equal(kiosk.pending, null);
  });
}
test('insufficient cash, including zero, cannot succeed', () => {
  const kiosk = ready();
  assert.throws(() => kiosk.beginPayment('139.99'), /Insufficient Payment/);
  assert.throws(() => kiosk.beginPayment('0'), /Insufficient Payment/);
  assert.throws(() => kiosk.finishPayment());
  assert.throws(() => kiosk.viewReceipt());
  assert.equal(kiosk.receipt, null);
});
test('exact cash is accepted with zero change', () => {
  const kiosk = ready(); kiosk.beginPayment('140');
  assert.equal(kiosk.stage, 'processing'); assert.equal(kiosk.receipt, null);
  const receipt = kiosk.finishPayment();
  assert.equal(receipt.paid, 14000); assert.equal(receipt.change, 0);
  assert.equal(receipt.total, 14000); assert.equal(receipt.method, 'Cash');
});
test('cash overpayment calculates centavo change and receipt fields', () => {
  const kiosk = ready(); kiosk.beginPayment('200.50');
  const receipt = kiosk.finishPayment(); kiosk.viewReceipt();
  assert.equal(receipt.change, 6050); assert.equal(receipt.count, 3);
  assert.equal(receipt.lines[0].subtotal, 9000);
  assert.equal(receipt.lines[1].price, 5000);
  assert.equal(receipt.status, 'Payment Successful');
  assert.ok(Number.isFinite(Date.parse(receipt.date)));
  assert.match(receipt.reference, /^CC-[A-F0-9-]{36}$/);
  assert.equal(kiosk.stage, 'receipt');
  assert.ok(Object.isFrozen(receipt)); assert.ok(Object.isFrozen(receipt.lines[0]));
});
for (const method of ['QR Payment', 'Credit/Debit Card']) {
  test(`${method} always pays the exact total with zero change`, () => {
    const kiosk = ready(method); kiosk.beginPayment('999999');
    const receipt = kiosk.finishPayment();
    assert.equal(receipt.method, method); assert.equal(receipt.paid, 14000); assert.equal(receipt.change, 0);
  });
}
test('processing locks editing, backward navigation and double payment', () => {
  const kiosk = ready(); kiosk.beginPayment('200');
  assert.throws(() => kiosk.change('coffee', 1));
  assert.throws(() => kiosk.back()); assert.throws(() => kiosk.beginPayment('200'));
  const receipt = kiosk.finishPayment();
  assert.throws(() => kiosk.finishPayment()); assert.equal(kiosk.receipt.reference, receipt.reference);
});
test('reset completely clears previous customer state and references are unique', () => {
  const kiosk = ready(); kiosk.beginPayment('200'); kiosk.finishPayment(); kiosk.viewReceipt();
  const firstReference = kiosk.receipt.reference;
  kiosk.reset();
  assert.equal(kiosk.stage, 'items'); assert.equal(kiosk.total, 0); assert.equal(kiosk.count, 0);
  assert.deepEqual(kiosk.lines, []); assert.equal(kiosk.method, null); assert.equal(kiosk.pending, null); assert.equal(kiosk.receipt, null);
  kiosk.change('water', 1); kiosk.review(); kiosk.paymentMethods(); kiosk.chooseMethod('QR Payment'); kiosk.beginPayment(); kiosk.finishPayment();
  assert.notEqual(kiosk.receipt.reference, firstReference); assert.equal(kiosk.receipt.total, 2000);
});
