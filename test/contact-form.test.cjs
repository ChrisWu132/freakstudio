const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

function fixture(result, valid = true, files = [], uploadOk = true, env = {}) {
  let submit, resets = 0, requests = 0, reported = 0, sent = null;
  const beacons = [], timers = [];
  const button = { innerHTML: 'Send', disabled: false };
  const note = { textContent: 'Contact us', className: 'form-note' };
  const form = {
    email: { value: 'test@example.com' }, whatsapp: { value: '+1 555 123 4567' }, whatsapp_ok: { checked: true },
    message: { value: 'A project' }, _honey: { value: '' }, files: { files },
    name: { value: env.name || '' }, company: { value: '' }, nda_required: { checked: !!env.nda },
    stage: { value: 'working_prototype', selectedIndex: 3, options: [, , , { text: 'I have a working prototype' }] },
    quantity: { value: '50' }, target_date: { value: '' },
    checkValidity: () => valid, reportValidity: () => reported++,
    reset: () => resets++, addEventListener: (type, fn) => { if (type === 'submit') submit = fn; },
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../js/main.js'), 'utf8'), {
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollY: 0,
      location: { search: env.search || '', pathname: env.pathname || '/' },
      sessionStorage: env.storage || memoryStorage(), localStorage: memoryStorage() },
    navigator: { sendBeacon: (url, blob) => { beacons.push(JSON.parse(blob.text)); return true; } },
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    document: {
      referrer: env.referrer || '', addEventListener() {},
      body: { appendChild() {}, classList: { add() {} } },
      createElement: () => ({ setAttribute() {} }),
      getElementById: (id) => ({ 'quote-form': form, 'submit-btn': button, 'form-note': note })[id],
      querySelectorAll: () => [],
    },
    URLSearchParams,
    AbortController,
    /* Timers fire only when a test calls fireTimers(): the upload timeout without a two-minute wait. */
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: (id) => { timers[id - 1] = null; },
    FormData: class { append() {} },
    fetch: async (url, init) => {
      if (url === '/api/upload') {
        const ok = Array.isArray(uploadOk) ? uploadOk.shift() : uploadOk; /* array: one answer per upload, in order */
        /* 'hang': a half-dead connection that only settles when the page aborts it. */
        if (ok === 'hang') return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
        return { ok, status: ok ? 200 : 500, json: async () => ({ url: 'https://anvol.dev/files/k/a.pdf' }) };
      }
      requests++; sent = JSON.parse(init.body); return { ok: true, json: async () => result };
    },
  });
  return { submit: () => submit({ preventDefault() {} }), form, button, note, sent: () => sent, beacons,
    fireTimers: () => timers.splice(0).forEach((fn) => fn && fn()),
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
  assert.equal(f.sent()._cc, 'zisheng@getanvol.com');
});

test('stage, quantity and target date go into the email', async () => {
  const f = fixture({ success: 'true' }); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().stage, 'working_prototype');
  assert.equal(f.sent().quantity, '50');
  assert.equal(f.sent().target_date, 'not given');
});

test('a failed upload still sends the enquiry and names the file that did not arrive', async () => {
  const f = fixture({ success: 'true' }, true, [{ size: 1000, name: 'ok.pdf' }, { size: 1000, name: 'board.zip' }], [true, false]);
  f.submit();
  await new Promise(setImmediate);
  assert.equal(f.counts().requests, 1);
  assert.equal(f.sent().attachments, 'https://anvol.dev/files/k/a.pdf');
  assert.equal(f.sent().attachments_failed, 'board.zip');
  assert.match(f.note.textContent, /board\.zip/);
  assert.equal(f.note.className, 'form-note err');
});

test('an upload that never answers is aborted and the enquiry still goes, naming the file', async () => {
  const f = fixture({ success: 'true' }, true, [{ size: 1000, name: 'ok.pdf' }, { size: 1000, name: 'stuck.step' }], [true, 'hang']);
  f.submit();
  await new Promise(setImmediate);
  assert.equal(f.counts().requests, 0, 'still waiting on the stuck upload');
  f.fireTimers();
  await new Promise(setImmediate);
  assert.equal(f.counts().requests, 1);
  assert.equal(f.sent().attachments, 'https://anvol.dev/files/k/a.pdf');
  assert.equal(f.sent().attachments_failed, 'stuck.step');
});

test('no attachments_failed field when every upload worked', async () => {
  const f = fixture({ success: 'true' }, true, [{ size: 1000, name: 'ok.pdf' }]); f.submit();
  await new Promise(setImmediate);
  assert.equal('attachments_failed' in f.sent(), false);
  assert.equal(f.note.className, 'form-note ok');
});

test('WhatsApp consent without a number is sent as no', async () => {
  const f = fixture({ success: 'true' });
  f.form.whatsapp.value = '  ';
  f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().whatsapp_ok, 'no');
  assert.equal(f.note.textContent, "Received. We'll reply by email.");
});

test('oversized file is refused before any request', () => {
  const f = fixture({ success: 'true' }, true, [{ size: 21 * 1024 * 1024 }]); f.submit();
  assert.equal(f.counts().requests, 0);
  assert.equal(f.note.className, 'form-note err');
});

test('UTM, referrer and landing page go into the email', async () => {
  const f = fixture({ success: 'true' }, true, [], true, {
    search: '?utm_source=linkedin&utm_medium=post&utm_campaign=oct', pathname: '/cases/', referrer: 'https://www.linkedin.com/' });
  f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().utm_source, 'linkedin');
  assert.equal(f.sent().utm_medium, 'post');
  assert.equal(f.sent().utm_campaign, 'oct');
  assert.equal(f.sent().utm_term, 'none');
  assert.equal(f.sent().landing_page, '/cases/');
  assert.equal(f.sent().referrer, 'https://www.linkedin.com/');
});

test('the first page of the visit wins over the page the form is on', async () => {
  const first = JSON.stringify({ landing_page: '/costs/', referrer: 'https://google.com/', utm_source: 'google' });
  const f = fixture({ success: 'true' }, true, [], true, {
    search: '?utm_source=other', pathname: '/', storage: memoryStorage({ 'anvol-source': first }) });
  f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().landing_page, '/costs/');
  assert.equal(f.sent().utm_source, 'google');
});

test('new visit stores its source for later pages', () => {
  const storage = memoryStorage();
  fixture({ success: 'true' }, true, [], true, { search: '?utm_source=x', pathname: '/brief/', storage });
  assert.equal(JSON.parse(storage.data['anvol-source']).utm_source, 'x');
});

test('blocked storage still sends the source of this page', async () => {
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  const f = fixture({ success: 'true' }, true, [], true, { search: '?utm_source=x', storage });
  f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().utm_source, 'x');
  assert.equal(f.sent().referrer, 'direct');
});

test('subject carries sender and time so Gmail keeps each enquiry in its own thread', async () => {
  const f = fixture({ success: 'true' }); f.submit();
  await new Promise(setImmediate);
  assert.match(f.sent()._subject, /^New project enquiry: anvol\.dev · test@example\.com · \d{4}-\d\d-\d\d \d\d:\d\d UTC$/);
});

test('a confirmed send records a project_form_submit event; page view is recorded on load', async () => {
  const f = fixture({ success: 'true' }); f.submit();
  await new Promise(setImmediate);
  const names = f.beacons.map((b) => b.event);
  assert.equal(names[0], 'page_view');
  assert.ok(names.includes('project_form_submit'));
  assert.equal(f.beacons.find((b) => b.event === 'project_form_submit').detail, 'working_prototype');
});

test('a rejected send records project_form_error, not a submit', async () => {
  const f = fixture({ success: false }); f.submit();
  await new Promise(setImmediate);
  const names = f.beacons.map((b) => b.event);
  assert.ok(names.includes('project_form_error'));
  assert.ok(!names.includes('project_form_submit'));
});

test('name, company and NDA request go into the email', async () => {
  const f = fixture({ success: 'true' }, true, [], true, { name: 'Ada', nda: true }); f.submit();
  await new Promise(setImmediate);
  assert.equal(f.sent().name, 'Ada');
  assert.equal(f.sent().company, 'not given');
  assert.equal(f.sent().nda_required, 'yes');
});
