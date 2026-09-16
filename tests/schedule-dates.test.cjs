const assert = require('node:assert/strict');
const { test } = require('node:test');
const { addDays, dateKeyLocal, startOfWeekLocal } = require('../src/lib/scheduleDates.ts');

const inWeek = (date, start, end) => date >= start && date < end;

test('Saturday September 12 at 09:00 is queried and grouped under Saturday', () => {
  const booking = new Date('2026-09-12T09:00');
  const start = startOfWeekLocal(booking);
  const end = addDays(start, 7);
  assert.equal(dateKeyLocal(start), '2026-09-06');
  assert.equal(dateKeyLocal(booking), '2026-09-12');
  assert.equal(booking.getDay(), 6);
  assert.ok(inWeek(booking, start, end));
  // Simulate transport to a UTC server: preserve both exact instants.
  assert.ok(inWeek(new Date(booking.toISOString()), new Date(start.toISOString()), new Date(end.toISOString())));
});

test('query includes every displayed day from midnight through 23:59', () => {
  const start = startOfWeekLocal(new Date('2026-09-16T12:00'));
  const end = addDays(start, 7);
  for (let index = 0; index < 7; index++) {
    const date = addDays(start, index);
    assert.ok(inWeek(date, start, end));
    const late = new Date(date);
    late.setHours(23, 59, 59, 999);
    assert.equal(dateKeyLocal(late), dateKeyLocal(date));
    assert.ok(inWeek(late, start, end));
  }
  assert.ok(!inWeek(new Date(start.getTime() - 1), start, end));
  assert.ok(!inWeek(end, start, end));
});

test('week navigation remains at local midnight over DST and year boundaries', () => {
  for (const day of ['2026-03-08T12:00', '2026-11-01T12:00', '2026-12-31T12:00']) {
    const start = startOfWeekLocal(new Date(day));
    const end = addDays(start, 7);
    assert.equal(start.getDay(), 0);
    assert.equal(end.getDay(), 0);
    assert.equal(start.getHours(), 0);
    assert.equal(end.getHours(), 0);
    assert.equal(addDays(end, -7).getTime(), start.getTime());
    const last = addDays(start, 6);
    last.setHours(23, 59);
    assert.ok(inWeek(last, start, end));
    if (process.env.TZ === 'America/New_York' && day.startsWith('2026-03')) {
      assert.equal((end - start) / 3600000, 167);
    }
    if (process.env.TZ === 'America/New_York' && day.startsWith('2026-11')) {
      assert.equal((end - start) / 3600000, 169);
    }
  }
});

test('UTC server week reproduces the missing Saturday reported in the video', () => {
  if (!['America/New_York', 'America/Los_Angeles', 'America/Mexico_City'].includes(process.env.TZ)) return;
  const oldServerStart = new Date('2026-09-13T00:00:00Z');
  assert.equal(dateKeyLocal(oldServerStart), '2026-09-12');
  assert.ok(new Date('2026-09-12T09:00') < oldServerStart);
  const correctedStart = startOfWeekLocal(oldServerStart);
  assert.ok(inWeek(new Date('2026-09-12T09:00'), correctedStart, addDays(correctedStart, 7)));
});
