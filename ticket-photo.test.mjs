import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(([tag]) => tag);
const inputById = id => inputs.find(tag => new RegExp(`\\bid="${id}"`).test(tag));
const attr = (tag, name) => tag?.match(new RegExp(`\\b${name}(?:="([^"]*)")?`))?.[1] ?? null;

test('ticket photo panel offers rear-camera capture and a separate existing-photo picker', () => {
  const camera = inputById('ticket-camera');
  const picker = inputById('ticket-photo');

  assert.ok(camera, 'a dedicated camera input is present');
  assert.equal(attr(camera, 'type'), 'file');
  assert.equal(attr(camera, 'accept'), 'image/*');
  assert.equal(attr(camera, 'capture'), 'environment');
  assert.match(html, /<label\b[^>]*for="ticket-camera"[^>]*>[^<]*直接拍照/);

  assert.ok(picker, 'the existing image picker remains present');
  assert.equal(attr(picker, 'type'), 'file');
  assert.equal(attr(picker, 'accept'), 'image/*');
  assert.equal(attr(picker, 'capture'), null, 'the picker does not force camera capture');
  assert.match(html, /<label\b[^>]*for="ticket-photo"[^>]*>[^<]*選擇相片/);
});

test('camera and picker feed one selected image to preview and OCR, and clear together', () => {
  assert.match(app, /const ticketPhotoInputs=\[\$\('ticket-camera'\),\$\('ticket-photo'\)\]\.filter\(Boolean\)/);
  assert.match(app, /ticketPhotoInputs\.forEach\(input=>input\.addEventListener\('change'/);
  assert.match(app, /const file=selectedTicketPhoto/);
  assert.match(app, /ticketPhotoInputs\.forEach\(input=>\{input\.value='';\}\);selectedTicketPhoto=null/);
});
