const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function fixture(result, valid = true, files = [], uploadOk = true) {
  let submit, resets = 0, requests = 0, reported = 0, sent = null;
  const button = { innerHTML: 'Send', disabled: false };
  const note = { textContent: 'Contact us', className: 'form-note' };
  const form = {
    email: { value: 'test@example.com' }, whatsapp: { value: '+1 555 123 4567' }, whatsapp_ok: { checked: true },
    message: { value: 'A project' }, _honey: { value: '' }, files: { files },
    checkValidity: () => valid, reportValidity: () => reported++,
    reset: () => resets++, addEventListener: (_, fn) => { submit = fn; },
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../js/main.js'), 'utf8'), {
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollY: 0 },
    document: {
      getElementById: (id) => ({ 'quote-form': form, 'submit-btn': button, 'form-note': note })[id],
      querySelectorAll: () => [],
    },
    FormData: class { append() {} },
    fetch: async (url, init) => {
      if (url === '/api/upload') return { ok: uploadOk, status: uploadOk ? 200 : 500, json: async () => ({ url: 'https://anvol.dev/files/k/a.pdf' }) };
      requests++; sent = JSON.parse(init.body); return { ok: true, json: async () => result };
    },
  });
  return { submit: () => submit({ preventDefault() {} }), button, note, sent: () => sent,
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

test('attachment links go into the email', async () => {
  const f = fixture({ success: 'true' }, true, [{ size: 1000 }]); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().attachments, 'https://anvol.dev/files/k/a.pdf');
  assert.equal(f.counts().resets, 1);
});

test('WhatsApp number and consent go into the email', async () => {
  const f = fixture({ success: 'true' }); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().whatsapp, '+1 555 123 4567');
  assert.equal(f.sent().whatsapp_ok, 'yes');
  assert.equal(f.sent().email, 'test@example.com');
});

test('failed upload sends nothing and keeps input', async () => {
  const f = fixture({ success: 'true' }, true, [{ size: 1000 }], false); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.counts().requests, 0);
  assert.equal(f.counts().resets, 0);
  assert.equal(f.note.className, 'form-note err');
});

test('oversized file is refused before any request', () => {
  const f = fixture({ success: 'true' }, true, [{ size: 21 * 1024 * 1024 }]); f.submit();
  assert.equal(f.counts().requests, 0);
  assert.equal(f.note.className, 'form-note err');
});
