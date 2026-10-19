import assert from 'node:assert/strict';
import dns from 'node:dns';
import { register } from 'node:module';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { ping } from './helpers/pingMock.js';

// Keep native ICMP outside this test process; exercise the real sensor and trigger.
register('./helpers/pingLoader.js', import.meta.url);
const { hap, persistedAccessory } = await import('./helpers/persistedAccessory.js');
const { MotionSensor } = await import('../dist/sensors/virtualSensorMotion.js');
const { shutdownSignal } = await import('../dist/utils/utils.js');

const alive = { success: true, latency: 2, message: '' };
const timeout = { success: false, latency: null, message: 'Request timed out' };

async function fixture(t, options = {}, lookupResult = { address: '2001:db8::10', family: 6 }) {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const lookup = t.mock.method(dns.promises, 'lookup', async () => {
    if (lookupResult instanceof Error) { throw lookupResult; }
    return lookupResult;
  });
  ping.mock.resetCalls();
  ping.mock.mockImplementation(async () => alive);
  const previousShutdown = shutdownSignal.isShuttingDown;
  shutdownSignal.isShuttingDown = false;
  t.after(() => {
    shutdownSignal.isShuttingDown = previousShutdown;
    ping.mock.resetCalls();
    ping.mock.mockImplementation(async () => alive);
  });
  const sensor = persistedAccessory(t, MotionSensor, {
    sensor: { trigger: 'ping' },
    pingTrigger: { host: '192.0.2.1', interval: 2, failureRetryCount: 3, isDisabled: false, ...options },
  }).create();
  await setImmediate();
  return {
    lookup,
    motion: sensor.service.getCharacteristic(hap.Characteristic.MotionDetected),
    async tick() {
      t.mock.timers.tick(120_000);
      await setImmediate();
    },
  };
}

test('ping failures activate motion at the threshold, stay active, recover and start a fresh streak', async (t) => {
  const f = await fixture(t);
  assert.equal(f.motion.value, false);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, false);
  await f.tick();
  assert.equal(f.motion.value, true);
  await f.tick();
  assert.equal(f.motion.value, true);
  assert.deepEqual(ping.mock.calls.map(call => call.arguments), Array(4).fill(['192.0.2.1']));
  assert.equal(f.lookup.mock.callCount(), 0);
  ping.mock.mockImplementation(async () => alive);
  await f.tick();
  assert.equal(f.motion.value, false);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, false);
  await f.tick();
  assert.equal(f.motion.value, true);
});

test('a successful ping interrupts a failure streak', async (t) => {
  const f = await fixture(t);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  ping.mock.mockImplementation(async () => alive);
  await f.tick();
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, false);
  await f.tick();
  assert.equal(f.motion.value, true);
});

test('hostname resolution supplies the address used to detect motion', async (t) => {
  const f = await fixture(t, { host: 'sensor.example' });
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, true);
  assert.deepEqual(ping.mock.calls.map(call => call.arguments), Array(3).fill(['2001:db8::10']));
});

test('DNS failure leaves motion inactive without subsequent network work', async (t) => {
  const f = await fixture(t, { host: 'missing.example' }, new Error('getaddrinfo ENOTFOUND'));
  const lookups = f.lookup.mock.callCount();
  assert.ok(lookups > 0);
  await f.tick();
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, false);
  assert.equal(ping.mock.callCount(), 0);
  assert.equal(f.lookup.mock.callCount(), lookups);
});

test('disabled ping leaves motion inactive without network work', async (t) => {
  const f = await fixture(t, { host: 'sensor.example', isDisabled: true });
  await f.tick();
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, false);
  assert.equal(f.lookup.mock.callCount(), 0);
  assert.equal(ping.mock.callCount(), 0);
});

test('shutdown prevents further network work and preserves active motion', async (t) => {
  const f = await fixture(t);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, true);
  const requests = ping.mock.callCount();
  shutdownSignal.isShuttingDown = true;
  ping.mock.mockImplementation(async () => alive);
  await f.tick();
  await f.tick();
  assert.equal(ping.mock.callCount(), requests);
  assert.equal(f.motion.value, true);
});

test('rejected ICMP requests activate motion and a successful request recovers', async (t) => {
  const f = await fixture(t);
  ping.mock.mockImplementation(async () => { throw new Error('Network is unreachable'); });
  await f.tick();
  await f.tick();
  assert.equal(f.motion.value, false);
  await f.tick();
  assert.equal(f.motion.value, true);
  ping.mock.mockImplementation(async () => alive);
  await f.tick();
  assert.equal(f.motion.value, false);
});
