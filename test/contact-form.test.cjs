const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function fixture(result, valid = true) {
  let submit, resets = 0, requests = 0, reported = 0;
  const button = { innerHTML: 'Send', disabled: false };
  const note = { textContent: 'Contact us', className: 'form-note' };
  const form = {
    name: { value: 'Test' }, email: { value: 'test@example.com' },
    message: { value: 'A project' }, link: { value: '' }, _honey: { value: '' },
    checkValidity: () => valid, reportValidity: () => reported++,
    reset: () => resets++, addEventListener: (_, fn) => { submit = fn; },
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../js/main.js'), 'utf8'), {
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollY: 0 },
    document: {
      getElementById: (id) => ({ 'quote-form': form, 'submit-btn': button, 'form-note': note })[id],
      querySelectorAll: () => [],
    },
    fetch: async () => { requests++; return { ok: true, json: async () => result }; },
  });
  return { submit: () => submit({ preventDefault() {} }), button, note,
    counts: () => ({ resets, requests, reported }) };
}

test('HTTP 200 with rejected form keeps input and reports failure', async () => {
  const f = fixture({ success: false }); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.note.className, 'form-note err');
  assert.equal(f.counts().resets, 0);
  assert.equal(f.button.disabled, false);
});

test('confirmed success resets the form', async () => {
  const f = fixture({ success: 'true' }); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.note.className, 'form-note ok');
  assert.equal(f.counts().resets, 1);
});

test('invalid email triggers native validation without submitting', () => {
  const f = fixture({}, false); f.submit();
  assert.deepEqual(f.counts(), { resets: 0, requests: 0, reported: 1 });
});
