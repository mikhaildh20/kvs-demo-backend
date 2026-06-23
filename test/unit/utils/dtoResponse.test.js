import test from 'node:test';
import assert from 'node:assert/strict';

import { success, error } from '../../../response/DtoResponse.js';

test('success creates correct success response', () => {
  const data = { user: 'john' };
  const message = 'Operation successful';
  const result = success(data, message);

  assert.equal(result.data, data);
  assert.equal(result.error, false);
  assert.equal(result.message, message);
});

test('success with no data', () => {
  const result = success();

  assert.equal(result.data, null);
  assert.equal(result.error, false);
  assert.equal(result.message, '');
});

test('success with only data', () => {
  const result = success({ test: 'value' });

  assert.deepEqual(result.data, { test: 'value' });
  assert.equal(result.error, false);
  assert.equal(result.message, '');
});

test('error creates correct error response', () => {
  const message = 'Something went wrong';
  const data = { detail: 'more info' };
  const result = error(message, data);

  assert.equal(result.data, data);
  assert.equal(result.error, true);
  assert.equal(result.message, message);
});

test('error with no data', () => {
  const result = error('Failed');

  assert.equal(result.data, null);
  assert.equal(result.error, true);
  assert.equal(result.message, 'Failed');
});

test('error with no message (default)', () => {
  const result = error();

  assert.equal(result.data, null);
  assert.equal(result.error, true);
  assert.equal(result.message, 'error');
});