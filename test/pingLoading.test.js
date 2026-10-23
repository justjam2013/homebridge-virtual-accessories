import assert from 'node:assert/strict';
import dns from 'node:dns';
import { register } from 'node:module';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';

register('./helpers/unavailablePingLoader.js', import.meta.url);
const { hap, persistedAccessory } = await import('./helpers/persistedAccessory.js');
const { default: registerPlugin } = await import('../dist/index.js');
const { GarageDoor } = await import('../dist/accessories/virtualAccessoryGarageDoor.js');
const { MotionSensor } = await import('../dist/sensors/virtualSensorMotion.js');
const { PingTrigger } = await import('../dist/sensors/triggers/triggerPing.js');

test('native ping loads only for configured triggers and load failure leaves each trigger inert', { timeout: 5000 }, async (t) => {
  const registerPlatform = t.mock.fn();
  registerPlugin({ registerPlatform });
  assert.equal(registerPlatform.mock.callCount(), 1);

  const createGarage = () => {
    const garage = persistedAccessory(t, GarageDoor, {
      garageDoor: { defaultState: 'closed', transitionDuration: 0 },
    }).create();
    t.after(() => garage.transitionTimer.stop());
    assert.equal(garage.getCurrentDoorState(), hap.Characteristic.CurrentDoorState.CLOSED);
    return garage;
  };
  createGarage();
  persistedAccessory(t, MotionSensor).create();
  await setImmediate();
  assert.equal(globalThis.pingLoadAttempts, undefined);

  // Test disabled first: it must still attempt to load the native dependency.
  for (const isDisabled of [true, false]) {
    const errors = [];
    let reportFailure;
    const failed = new Promise(resolve => { reportFailure = resolve; });
    const sensor = persistedAccessory(t, MotionSensor, {
      sensor: { trigger: 'ping' },
      pingTrigger: { host: 'sensor.example', interval: 1, failureRetryCount: 1, isDisabled },
    }).create();
    // Observe asynchronous trigger initialization after HomeKit construction.
    const interval = t.mock.method(globalThis, 'setInterval');
    const timer = t.mock.method(globalThis, 'setTimeout');
    const lookup = t.mock.method(dns.promises, 'lookup');
    const callback = t.mock.method(sensor, 'triggerSensorState');
    sensor.platform.log.error = message => { errors.push(message); reportFailure(); };
    await failed;
    await setImmediate();
    await setImmediate();
    assert.ok(sensor.getTrigger() instanceof PingTrigger);
    assert.equal(globalThis.pingLoadAttempts, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\[Test accessory\] Ping trigger unavailable: Native binding unavailable \(test\)/);
    assert.equal(interval.mock.callCount(), 0);
    assert.equal(timer.mock.callCount(), 0);
    assert.equal(lookup.mock.callCount(), 0);
    assert.equal(callback.mock.callCount(), 0);
    assert.equal(globalThis.unavailablePingCalls, undefined);
    assert.equal(sensor.service.getCharacteristic(hap.Characteristic.MotionDetected).value, false);
    interval.mock.restore();
    timer.mock.restore();
    lookup.mock.restore();
  }
  // Accessory construction also succeeds after the native import has failed.
  createGarage();
});
