import test from 'node:test';
import assert from 'node:assert/strict';

import { extractPlaceholders, validateQrPattern } from '../../../utils/qrFormatValidator.js';

test('extractPlaceholders returns empty array for no placeholders', () => {
  const result = extractPlaceholders('static-text-no-placeholders');
  assert.deepEqual(result, []);
});

test('extractPlaceholders extracts single placeholder', () => {
  const result = extractPlaceholders('{PART_NUMBER}');
  assert.deepEqual(result, ['PART_NUMBER']);
});

test('extractPlaceholders extracts multiple placeholders', () => {
  const result = extractPlaceholders('{PART_NUMBER}-{LOT_NO}-{SEQ}');
  assert.deepEqual(result, ['PART_NUMBER', 'LOT_NO', 'SEQ']);
});

test('extractPlaceholders preserves modifier tokens', () => {
  const result = extractPlaceholders('{PART_NUMBER:LOWER:NODASH}');
  assert.deepEqual(result, ['PART_NUMBER:LOWER:NODASH']);
});

test('extractPlaceholders trims whitespace inside braces', () => {
  const result = extractPlaceholders('{  LOT_NO  }');
  assert.deepEqual(result, ['LOT_NO']);
});

test('validateQrPattern accepts valid pattern with known tokens', () => {
  const result = validateQrPattern('{PART_NUMBER}-{LOT_NO}-{SEQ}');
  assert.equal(result, true);
});

test('validateQrPattern rejects unknown token', () => {
  assert.throws(
    () => validateQrPattern('{UNKNOWN}'),
    /Unknown placeholder: UNKNOWN/
  );
});

test('validateQrPattern accepts all allowed tokens', () => {
  const result = validateQrPattern(
    '{PART_NUMBER}-{SUPPLIER}-{QTY}-{LOT_NO}-{LOT_DATE}-{KBN}-{SEQ}'
  );
  assert.equal(result, true);
});

test('validateQrPattern accepts PART_NUMBER with LOWER modifier', () => {
  assert.equal(validateQrPattern('{PART_NUMBER:LOWER}'), true);
});

test('validateQrPattern accepts PART_NUMBER with NODASH modifier', () => {
  assert.equal(validateQrPattern('{PART_NUMBER:NODASH}'), true);
});

test('validateQrPattern accepts PART_NUMBER with combined modifiers', () => {
  assert.equal(validateQrPattern('{PART_NUMBER:LOWER:NODASH}'), true);
});

test('validateQrPattern rejects PART_NUMBER with unknown modifier', () => {
  assert.throws(
    () => validateQrPattern('{PART_NUMBER:UPPER}'),
    /Unknown placeholder: PART_NUMBER:UPPER/
  );
});

test('validateQrPattern accepts SUPPLIER with numeric width', () => {
  assert.equal(validateQrPattern('{SUPPLIER:6}'), true);
});

test('validateQrPattern rejects SUPPLIER with non-numeric modifier', () => {
  assert.throws(
    () => validateQrPattern('{SUPPLIER:abc}'),
    /Unknown placeholder: SUPPLIER:abc/
  );
});

test('validateQrPattern rejects SUPPLIER with multiple modifiers', () => {
  assert.throws(
    () => validateQrPattern('{SUPPLIER:4:extra}'),
    /Unknown placeholder: SUPPLIER:4:extra/
  );
});

test('validateQrPattern rejects LOT_NO with modifiers', () => {
  assert.throws(
    () => validateQrPattern('{LOT_NO:xyz}'),
    /Unknown placeholder: LOT_NO:xyz/
  );
});

test('validateQrPattern returns true for empty pattern', () => {
  assert.equal(validateQrPattern(''), true);
  assert.equal(validateQrPattern(), true);
});