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

const inputSeparators = {
  COP: { group: '.', decimal: ',' },
  PEN: { group: ',', decimal: '.' },
  USD: { group: ',', decimal: '.' },
  EUR: { group: '.', decimal: ',' },
};

test('typing larger amounts preserves every digit across thousands separators', () => {
  const expectedAmounts = ['2', '28', '281', '2.810', '28.100', '281.000', '2.810.000', '28.100.000'];

  for (const { code } of CURRENCIES) {
    let input = '';
    for (const [index, digit] of [...'28100000'].entries()) {
      input = formatCurrencyInput(input + digit, code);
      const expected = expectedAmounts[index].replaceAll('.', inputSeparators[code].group);
      assert.equal(input, expected, `${code}: digit ${index + 1}`);
      assert.equal(parseCurrencyInput(input, { currency: code }), Number('28100000'.slice(0, index + 1)));
    }
  }
});

test('deleting digits from a grouped amount keeps the remaining integer value', () => {
  for (const { code } of CURRENCIES) {
    let input = formatCurrencyInput('28100', code);
    for (const expected of [2810, 281, 28, 2]) {
      input = formatCurrencyInput(input.slice(0, -1), code);
      assert.equal(parseCurrencyInput(input, { currency: code }), expected, `${code}: ${input}`);
    }
    assert.equal(formatCurrencyInput(input.slice(0, -1), code), '');
  }
});

test('editing inside a grouped amount does not introduce decimals', () => {
  for (const { code } of CURRENCIES) {
    const { group } = inputSeparators[code];
    assert.equal(parseCurrencyInput(formatCurrencyInput(`2${group}9810`, code), { currency: code }), 29810);
    assert.equal(parseCurrencyInput(formatCurrencyInput(`2${group}80`, code), { currency: code }), 280);
  }
});

test('typing a locale decimal separator preserves cents after a large amount', () => {
  for (const { code } of CURRENCIES) {
    const { group, decimal } = inputSeparators[code];
    let input = formatCurrencyInput('28100', code);
    input = formatCurrencyInput(input + decimal, code);
    assert.equal(input, `28${group}100${decimal}`);
    input = formatCurrencyInput(input + '5', code);
    input = formatCurrencyInput(input + '6', code);
    assert.equal(input, `28${group}100${decimal}56`);
    assert.equal(parseCurrencyInput(input, { currency: code }), 28100.56);
    assert.equal(formatCurrencyInput(input + '7', code), input);
  }
});
