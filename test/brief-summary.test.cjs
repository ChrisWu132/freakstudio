const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize, GAPS } = require('../js/brief-summary.js');

const missingFields = (f) => summarize(f).missing.map((m) => m.field);

const complete = {
  email: 'a@b.com', whatsapp: '+1 555', whatsapp_ok: 'yes', current_stage: 'working_prototype',
  what_works_today: 'ESP32 board works', product_description: 'Soil meter', features: ['Sensors', 'Battery'],
  environment: 'outdoors', size: '80 x 50 mm', processes: ['CNC'], prototype_qty: '3', annual_volume: '2000',
  target_unit_cost: '$40', target_date: 'March 2027', budget_range: 'Under $5,000', target_market: 'US',
  certification_requirements: ['FCC'], destination: 'Texas', files_available: ['BOM'], attachments: [], file_links: '',
};

test('a complete brief has no gaps and says so in the text', () => {
  const s = summarize(complete);
  assert.deepEqual(s.missing, []);
  assert.match(s.text, /Missing: nothing from our checklist/);
});

test('stage key becomes its label; unknown stage reads "Not given"', () => {
  assert.equal(summarize(complete).stage, 'Working prototype');
  assert.equal(summarize({ ...complete, current_stage: '' }).stage, 'Not given');
  assert.ok(missingFields({ ...complete, current_stage: '' }).includes('current_stage'));
});

test('each empty field is listed with why it matters', () => {
  const s = summarize({ ...complete, size: '', budget_range: '  ', features: [] });
  assert.deepEqual(s.missing.map((m) => m.field), ['features', 'size', 'budget_range']);
  s.missing.forEach((m) => assert.ok(m.why.length > 20));
  assert.match(s.text, /- Target size: Size sets the board shape/);
});

test('idea stage is not asked for design files or what works today', () => {
  const idea = { ...complete, current_stage: 'idea', files_available: [], what_works_today: '' };
  assert.ok(!missingFields(idea).includes('files'));
  assert.ok(!missingFields(idea).includes('what_works_today'));
});

test('past the idea stage, no files, uploads or links is a gap', () => {
  const noFiles = { ...complete, files_available: [], attachments: [], file_links: '' };
  assert.ok(missingFields(noFiles).includes('files'));
  assert.ok(!missingFields({ ...noFiles, file_links: 'https://drive' }).includes('files'));
  assert.ok(!missingFields({ ...noFiles, attachments: ['https://anvol.dev/files/x'] }).includes('files'));
});

test('certifications are only asked once a market is given', () => {
  assert.ok(!missingFields({ ...complete, target_market: '', certification_requirements: [] }).includes('certification_requirements'));
  assert.ok(missingFields({ ...complete, certification_requirements: [] }).includes('certification_requirements'));
});

test('what we have lists given fields with labels and joins lists', () => {
  const have = Object.fromEntries(summarize(complete).have);
  assert.equal(have['Includes'], 'Sensors, Battery');
  assert.equal(have['Main function'], 'Soil meter');
  assert.ok(!('Uploaded files' in have));
});

test('next step names Zisheng and the channel the visitor allowed', () => {
  assert.match(summarize(complete).next, /^Zisheng Li.*on WhatsApp/);
  assert.match(summarize({ ...complete, whatsapp_ok: 'no' }).next, /by email/);
  assert.match(summarize({ ...complete, whatsapp: '' }).next, /by email/);
});

test('every gap rule has a field, a label and a reason', () => {
  GAPS.forEach((g) => { assert.ok(g.field && g.label && g.why); });
});
