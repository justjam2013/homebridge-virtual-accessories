import assert from 'node:assert/strict';
import { test } from 'node:test';

// Initialize the accessory graph through the same entry point as existing tests.
await import('../dist/accessories/virtualAccessoryBattery.js');
const { BinarySensor } = await import('../dist/sensors/binarySensor.js');

// A BinarySensor without HomeKit plumbing: only what triggerSensorState() and getJsonState() use.
function sensor(t, { accessoryIsStateful = true, trigger = 'webhook', state = BinarySensor.NORMAL } = {}) {
  const fake = Object.create(BinarySensor.prototype);
  let current = state;
  Object.assign(fake, {
    accessoryName: 'My Webhook Sensor',
    accessoryConfiguration: { accessoryID: '1234567', accessoryIsStateful, sensor: { type: 'occupancy', trigger } },
    log: { info() {}, debug() {}, error() {} },
    EventDetectedCharacteristic: {},
    getSensorState: () => current,
    updateCharacteristicValue: (characteristic, value) => (current = value),
    saveState: t.mock.fn(),
  });
  return fake;
}

const triggerFor = { sensorConfig: { accessoryID: '1234567' } };

test('stateful webhook sensors save their state when it changes', async (t) => {
  const s = sensor(t);
  await s.triggerSensorState(BinarySensor.TRIGGERED, triggerFor);
  assert.equal(s.saveState.mock.callCount(), 1);
  assert.equal(s.getJsonState(), JSON.stringify({ SensorState: BinarySensor.TRIGGERED }));

  // No change, no write.
  await s.triggerSensorState(BinarySensor.TRIGGERED, triggerFor);
  assert.equal(s.saveState.mock.callCount(), 1);

  await s.triggerSensorState(BinarySensor.NORMAL, triggerFor);
  assert.equal(s.saveState.mock.callCount(), 2);
  assert.equal(s.getJsonState(), JSON.stringify({ SensorState: BinarySensor.NORMAL }));
});

test('sensors that are not stateful, or not webhook-triggered, do not persist', async (t) => {
  for (const options of [{ accessoryIsStateful: false }, { trigger: 'cron' }, { trigger: 'ping' }, { trigger: 'startup' }]) {
    const s = sensor(t, options);
    await s.triggerSensorState(BinarySensor.TRIGGERED, triggerFor);
    assert.equal(s.saveState.mock.callCount(), 0, JSON.stringify(options));
    assert.equal(s.getJsonState(), '{}');
  }
});

test('stored sensor states are read back defensively', () => {
  assert.equal(BinarySensor.getStoredSensorState({ SensorState: BinarySensor.TRIGGERED }), BinarySensor.TRIGGERED);
  assert.equal(BinarySensor.getStoredSensorState({ SensorState: BinarySensor.NORMAL }), BinarySensor.NORMAL);
  for (const json of [undefined, {}, { SensorState: 2 }, { SensorState: '1' }, { SensorState: true }, { SensorState: null }]) {
    assert.equal(BinarySensor.getStoredSensorState(json), undefined, JSON.stringify(json));
  }
});
