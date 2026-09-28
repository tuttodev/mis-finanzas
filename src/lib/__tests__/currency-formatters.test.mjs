import assert from 'node:assert/strict';
import test from 'node:test';
import { CURRENCIES, formatCurrencyInput, parseCurrencyInput } from '../formatters.ts';

test('each supported currency round-trips grouped amounts without changing their value', () => {
  for (const { code } of CURRENCIES) {
    const input = formatCurrencyInput(1234567.89, code);
    assert.equal(parseCurrencyInput(input, { currency: code }), 1234567.89, `${code}: ${input}`);
  }
});

test('group separators are not mistaken for decimal separators', () => {
  assert.equal(parseCurrencyInput('1.234', { currency: 'COP' }), 1234);
  assert.equal(parseCurrencyInput('1,234', { currency: 'PEN' }), 1234);
  assert.equal(parseCurrencyInput('1,234', { currency: 'USD' }), 1234);
  assert.equal(parseCurrencyInput('1.234', { currency: 'EUR' }), 1234);
});

test('currency inputs accept decimal amounts in their locale', () => {
  assert.equal(parseCurrencyInput('1.234,56', { currency: 'COP' }), 1234.56);
  assert.equal(parseCurrencyInput('1,234.56', { currency: 'PEN' }), 1234.56);
  assert.equal(parseCurrencyInput('1,234.56', { currency: 'USD' }), 1234.56);
  assert.equal(parseCurrencyInput('1.234,56', { currency: 'EUR' }), 1234.56);
});
