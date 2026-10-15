import assert from 'node:assert/strict';
import dns from 'node:dns';
import { register } from 'node:module';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { ping } from './helpers/pingMock.js';

// Register before importing the compiled trigger, including its transitive imports.
// Unlike mock.module, this works without changing npm test's Node flags.
register('./helpers/pingLoader.js', import.meta.url);
// Initialize the accessory graph through the same entry point as existing tests.
await import('../dist/accessories/virtualAccessoryBattery.js');
const { PingTrigger } = await import('../dist/sensors/triggers/triggerPing.js');
const { BinarySensor } = await import('../dist/sensors/binarySensor.js');
const { shutdownSignal } = await import('../dist/utils/utils.js');

const alive = { success: true, latency: 2, message: '' };
const timeout = { success: false, latency: null, message: 'Request timed out' };

async function fixture(t, options = {}, lookupResult = { address: '192.0.2.10', family: 4 }) {
  const config = { host: '192.0.2.1', interval: 2, failureRetryCount: 3, isDisabled: false, ...options };
  const log = { info: t.mock.fn(), error: t.mock.fn(), debug: t.mock.fn() };
  const sensor = {
    accessoryConfiguration: { accessoryName: 'Ping sensor', pingTrigger: config },
    platform: { log },
    triggerSensorState: t.mock.fn(),
  };
  const lookup = t.mock.method(dns.promises, 'lookup', async () => {
    if (lookupResult instanceof Error) { throw lookupResult; }
    return lookupResult;
  });
  const unref = t.mock.fn();
  const schedule = t.mock.method(globalThis, 'setInterval', () => ({ unref }));
  ping.mock.resetCalls();
  ping.mock.mockImplementation(async () => alive);
  const previousShutdown = shutdownSignal.isShuttingDown;
  shutdownSignal.isShuttingDown = false;
  t.after(() => {
    shutdownSignal.isShuttingDown = previousShutdown;
    ping.mock.resetCalls();
    ping.mock.mockImplementation(async () => alive);
  });
  const trigger = new PingTrigger(sensor, 'Ping trigger');
  // Drain asynchronous constructor setup without waiting for real intervals.
  await setImmediate();
  const tick = async () => {
    assert.equal(schedule.mock.callCount(), 1);
    const [callback, , ...args] = schedule.mock.calls[0].arguments;
    await callback(...args);
  };
  const states = () => sensor.triggerSensorState.mock.calls.map(call => call.arguments);
  return { trigger, config, log, lookup, schedule, unref, tick, states };
}

for (const host of ['192.0.2.1', '2001:db8::1']) {
  test(`PingTrigger pings IP literal ${host} without DNS`, async (t) => {
    const f = await fixture(t, { host });
    assert.equal(f.lookup.mock.callCount(), 0);
    assert.equal(f.schedule.mock.callCount(), 1);
    assert.equal(f.schedule.mock.calls[0].arguments[1], 120_000);
    assert.equal(f.unref.mock.callCount(), 1);
    assert.equal(ping.mock.callCount(), 0);
    await f.tick();
    assert.deepEqual(ping.mock.calls[0].arguments, [host]);
    assert.deepEqual(f.states(), [[BinarySensor.NORMAL, f.trigger]]);
  });
}

for (const result of [{ address: '192.0.2.10', family: 4 }, { address: '2001:db8::10', family: 6 }]) {
  test(`PingTrigger resolves hostnames with IPv4 preference and accepts IPv${result.family}`, async (t) => {
    const f = await fixture(t, { host: 'sensor.example' }, result);
    assert.equal(f.lookup.mock.callCount(), 1);
    assert.deepEqual(f.lookup.mock.calls[0].arguments, ['sensor.example', {
      hints: dns.ADDRCONFIG | dns.V4MAPPED, order: 'ipv4first',
    }]);
    assert.equal(f.config.host, result.address);
    await f.tick();
    await f.tick();
    assert.equal(f.lookup.mock.callCount(), 1);
    assert.deepEqual(ping.mock.calls.map(call => call.arguments), [[result.address], [result.address]]);
  });
}

test('PingTrigger ends setup after one DNS failure without counting a ping failure', async (t) => {
  const f = await fixture(t, { host: 'missing.example' }, new Error('getaddrinfo ENOTFOUND'));
  await setImmediate();
  assert.equal(f.lookup.mock.callCount(), 1);
  assert.equal(f.schedule.mock.callCount(), 0);
  assert.equal(ping.mock.callCount(), 0);
  assert.equal(f.trigger.failureCount.value, 0);
  assert.deepEqual(f.states(), []);
  assert.equal(f.config.host, 'missing.example');
  assert.ok(f.log.error.mock.calls.some(call => call.arguments[0].includes('ENOTFOUND')));
});

test('disabled PingTrigger neither resolves nor schedules pings', async (t) => {
  const f = await fixture(t, { host: 'sensor.example', isDisabled: true });
  assert.equal(f.lookup.mock.callCount(), 0);
  assert.equal(f.schedule.mock.callCount(), 0);
  assert.equal(ping.mock.callCount(), 0);
  assert.deepEqual(f.states(), []);
});

test('PingTrigger counts failures, triggers once at the threshold, and recovers', async (t) => {
  const f = await fixture(t);
  ping.mock.mockImplementation(async () => timeout);
  for (let count = 1; count < 3; count++) {
    await f.tick();
    assert.equal(f.trigger.failureCount.value, count);
    assert.deepEqual(f.states(), []);
    assert.equal(f.log.error.mock.callCount(), 0);
  }
  await f.tick();
  assert.deepEqual(f.states(), [[BinarySensor.TRIGGERED, f.trigger]]);
  assert.equal(f.log.error.mock.callCount(), 1);
  await f.tick();
  assert.equal(f.trigger.failureCount.value, 4);
  assert.equal(f.states().length, 1);
  assert.equal(f.log.error.mock.callCount(), 1);
  ping.mock.mockImplementation(async () => alive);
  await f.tick();
  assert.equal(f.trigger.failureCount.value, 0);
  assert.deepEqual(f.states(), [[BinarySensor.TRIGGERED, f.trigger], [BinarySensor.NORMAL, f.trigger]]);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  assert.equal(f.states().length, 2);
  await f.tick();
  assert.deepEqual(f.states().at(-1), [BinarySensor.TRIGGERED, f.trigger]);
  assert.equal(f.states().length, 3);
});

test('a successful ping breaks a sequence of failures below the threshold', async (t) => {
  const f = await fixture(t);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  ping.mock.mockImplementation(async () => alive);
  await f.tick();
  assert.equal(f.trigger.failureCount.value, 0);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  await f.tick();
  assert.deepEqual(f.states(), [[BinarySensor.NORMAL, f.trigger]]);
});

test('shutdown prevents subsequent scheduled pings and state changes', async (t) => {
  const f = await fixture(t);
  ping.mock.mockImplementation(async () => timeout);
  await f.tick();
  shutdownSignal.isShuttingDown = true;
  await f.tick();
  await f.tick();
  assert.equal(ping.mock.callCount(), 1);
  assert.equal(f.trigger.failureCount.value, 1);
  assert.deepEqual(f.states(), []);
});

for (const message of ['No route to host', 'Network is unreachable']) {
  test(`network rejection (${message}) reaches the failure threshold`, async (t) => {
    const f = await fixture(t);
    ping.mock.mockImplementation(async () => { throw new Error(message); });
    await f.tick();
    await f.tick();
    assert.deepEqual(f.states(), []);
    await f.tick();
    assert.equal(ping.mock.callCount(), 3);
    assert.equal(f.trigger.failureCount.value, 3);
    assert.deepEqual(f.states(), [[BinarySensor.TRIGGERED, f.trigger]]);
  });
}
