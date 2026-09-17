const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cancelScheduledClassRecord } = require('../src/lib/cancelScheduledClass.ts');

// Transactional in-memory adapter: exercises production cancellation logic without
// connecting to customer data. Failures roll back; transactions serialize writes.
function fixture(status = 'POSTED', failRefund = false) {
  let state = {
    class: { id: 'class', status, postedAt: 'posted', googleEventId: 'event' },
    participants: [
      { id: 'p1', scheduledClassId: 'class', clientId: 'package', usePackage: true, postedSessionId: status === 'POSTED' ? 's1' : null },
      { id: 'p2', scheduledClassId: 'class', clientId: 'cash', usePackage: false, postedSessionId: status === 'POSTED' ? 's2' : null },
    ],
    balances: { package: 4, cash: 0 },
    sessions: status === 'POSTED' ? [{ id: 's1', price: 0, isPaid: true }, { id: 's2', price: 300, isPaid: false }, { id: 'unrelated', price: 500, isPaid: true }] : [{ id: 'unrelated', price: 500, isPaid: true }],
  };
  let queue = Promise.resolve();
  const db = { $transaction(run) {
    const result = queue.then(async () => {
      const draft = structuredClone(state);
      const tx = {
        scheduledClass: { async updateMany({ where, data }) {
          if (where.id !== draft.class.id || where.status !== draft.class.status) return { count: 0 };
          Object.assign(draft.class, data); return { count: 1 };
        } },
        scheduledParticipant: {
          async findMany({ where }) { return structuredClone(draft.participants.filter(p => p.scheduledClassId === where.scheduledClassId)); },
          async update({ where, data }) { Object.assign(draft.participants.find(p => p.id === where.id), data); },
        },
        session: { async deleteMany({ where }) { draft.sessions = draft.sessions.filter(s => s.id !== where.id); } },
        client: { async update({ where, data }) {
          if (failRefund) throw Error('Injected refund failure');
          draft.balances[where.id] += data.classPackBalance.increment;
        } },
      };
      const value = await run(tx); state = draft; return value;
    });
    queue = result.catch(() => {}); return result;
  } };
  return { db, snapshot: () => structuredClone(state) };
}

test('POSTED cancellation reverses only linked revenue and package credit, retaining class and participants', async () => {
  const f = fixture();
  assert.equal((await cancelScheduledClassRecord(f.db, 'class', 'POSTED', 'CANCELLED')).success, true);
  const state = f.snapshot();
  assert.equal(state.class.status, 'CANCELLED');
  assert.equal(state.class.postedAt, null);
  assert.equal(state.class.googleEventId, null);
  assert.deepEqual(state.sessions, [{ id: 'unrelated', price: 500, isPaid: true }]);
  assert.deepEqual(state.balances, { package: 5, cash: 0 });
  assert.equal(state.participants.length, 2);
  assert.ok(state.participants.every(p => p.postedSessionId === null));
});

test('SCHEDULED cancellation does not refund an unused package credit', async () => {
  const f = fixture('SCHEDULED');
  const before = f.snapshot();
  await cancelScheduledClassRecord(f.db, 'class', 'SCHEDULED', 'CANCELLED');
  assert.deepEqual(f.snapshot().balances, before.balances);
  assert.deepEqual(f.snapshot().sessions, before.sessions);
});

test('two simultaneous cancellation requests refund once', async () => {
  const f = fixture();
  const results = await Promise.all([1, 2].map(() => cancelScheduledClassRecord(f.db, 'class', 'POSTED', 'CANCELLED')));
  assert.equal(results.filter(r => r.success).length, 1);
  assert.equal(f.snapshot().balances.package, 5);
});

test('repeated and stale cancellation does not touch accounting', async () => {
  const f = fixture();
  await cancelScheduledClassRecord(f.db, 'class', 'POSTED', 'CANCELLED');
  const before = f.snapshot();
  assert.equal((await cancelScheduledClassRecord(f.db, 'class', 'POSTED', 'CANCELLED')).success, false);
  assert.deepEqual(f.snapshot(), before);
});

test('an accounting failure rolls back status, session deletion, links and credits', async () => {
  const f = fixture('POSTED', true);
  const before = f.snapshot();
  await assert.rejects(cancelScheduledClassRecord(f.db, 'class', 'POSTED', 'CANCELLED'), /Injected/);
  assert.deepEqual(f.snapshot(), before);
});

test('NO_SHOW reverses posted accounting through the same transaction', async () => {
  const f = fixture();
  await cancelScheduledClassRecord(f.db, 'class', 'POSTED', 'NO_SHOW');
  assert.equal(f.snapshot().class.status, 'NO_SHOW');
  assert.equal(f.snapshot().balances.package, 5);
  assert.equal(f.snapshot().sessions.length, 1);
});

test('invalid prior states and missing classes leave data untouched', async () => {
  const f = fixture(); const before = f.snapshot();
  assert.equal((await cancelScheduledClassRecord(f.db, 'class', 'CANCELLED', 'CANCELLED')).success, false);
  assert.equal((await cancelScheduledClassRecord(f.db, 'missing', 'POSTED', 'CANCELLED')).success, false);
  assert.deepEqual(f.snapshot(), before);
});
