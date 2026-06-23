import test from 'node:test';
import assert from 'node:assert/strict';

import { renderQrPatternBackend } from '../../../utils/qrEngine.js';

test('PART_NUMBER renders with upper-case default', () => {
  const result = renderQrPatternBackend('ABC-{PART_NUMBER}XYZ', { PART_NUMBER: 'abc-123' });
  assert.equal(result, 'ABC-abc-123XYZ');
});

test('PART_NUMBER with LOWER modifier', () => {
  const result = renderQrPatternBackend('{PART_NUMBER:LOWER}', { PART_NUMBER: 'ABC-123-DEF' });
  assert.equal(result, 'abc-123-def');
});

test('PART_NUMBER with NODASH modifier removes dashes', () => {
  const result = renderQrPatternBackend('{PART_NUMBER:NODASH}', { PART_NUMBER: 'ABC-123' });
  assert.equal(result, 'ABC123');
});

test('PART_NUMBER with both LOWER and NODASH modifiers', () => {
  const result = renderQrPatternBackend('{PART_NUMBER:LOWER:NODASH}', { PART_NUMBER: 'ABC-123' });
  assert.equal(result, 'abc123');
});

test('SUPPLIER renders without modifiers', () => {
  const result = renderQrPatternBackend('{SUPPLIER}', { SUPPLIER: 'VENDOR' });
  assert.equal(result, 'VENDOR');
});

test('SUPPLIER with width modifier pads leading zeros', () => {
  const result = renderQrPatternBackend('{SUPPLIER:6}', { SUPPLIER: '42' });
  assert.equal(result, '000042');
});

test('QTY renders plain without modifiers', () => {
  const result = renderQrPatternBackend('{QTY}', { QTY: '99' });
  assert.equal(result, '99');
});

test('QTY with width modifier pads leading zeros', () => {
  const result = renderQrPatternBackend('{QTY:5}', { QTY: '123' });
  assert.equal(result, '00123');
});

test('SEQ pads with default length 4 when seqLength is absent', () => {
  const result = renderQrPatternBackend('{SEQ}', { SEQ: '7' });
  assert.equal(result, '0007');
});

test('SEQ pads with custom seqLength', () => {
  const result = renderQrPatternBackend('{SEQ}', { SEQ: '7' }, 6);
  assert.equal(result, '000007');
});

test('SEQ pads with default when seqLength is invalid (zero)', () => {
  const result = renderQrPatternBackend('{SEQ}', { SEQ: '42' }, 0);
  assert.equal(result, '0042');
});

test('SEQ pads with default when seqLength is negative', () => {
  const result = renderQrPatternBackend('{SEQ}', { SEQ: '1' }, -2);
  assert.equal(result, '0001');
});

test('LOT_NO renders plain value', () => {
  const result = renderQrPatternBackend('{LOT_NO}', { LOT_NO: 'LOT202401' });
  assert.equal(result, 'LOT202401');
});

test('LOT_DATE renders plain value', () => {
  const result = renderQrPatternBackend('{LOT_DATE}', { LOT_DATE: '2024-01-15' });
  assert.equal(result, '2024-01-15');
});

test('KBN renders plain value', () => {
  const result = renderQrPatternBackend('{KBN}', { KBN: 'TYPE-A' });
  assert.equal(result, 'TYPE-A');
});

test('combined pattern with multiple placeholders', () => {
  const result = renderQrPatternBackend(
    '{PART_NUMBER:LOWER}_{LOT_NO}_{SEQ}',
    { PART_NUMBER: 'ABC', LOT_NO: 'L2024', SEQ: '5' },
    3
  );
  assert.equal(result, 'abc_L2024_005');
});

test('unknown placeholder throws', () => {
  assert.throws(
    () => renderQrPatternBackend('{UNKNOWN}', {}),
    /Unknown placeholder: UNKNOWN/
  );
});

test('pattern with no placeholders is returned as-is', () => {
  const result = renderQrPatternBackend('static-text');
  assert.equal(result, 'static-text');
});

test('null pattern returns empty string', () => {
  const result = renderQrPatternBackend(null);
  assert.equal(result, '');
});

test('missing value for placeholder returns empty string', () => {
  const result = renderQrPatternBackend('{PART_NUMBER}', {});
  assert.equal(result, '');
});