import test from 'node:test';
import assert from 'node:assert/strict';

import { splitTextForTts } from '../services/voice.service.js';

test('splitTextForTts splits long voice descriptions into provider-safe chunks', () => {
  const text = Array.from({ length: 40 }, (_, index) => `Instruction ${index + 1} harus dicek sesuai urutan kerja.`).join(' ');
  const chunks = splitTextForTts(text);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 180));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text.replace(/\s+/g, ' '));
});
