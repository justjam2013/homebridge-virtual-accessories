import assert from 'node:assert/strict';
import { test } from 'node:test';

// Initialize the accessory graph through the same entry point as existing tests.
await import('../dist/accessories/virtualAccessoryBattery.js');
const { MeasurementSensor } = await import('../dist/sensors/measurementSensor.js');
const { TemperatureSensor } = await import('../dist/sensors/virtualSensorTemperature.js');
const { HumiditySensor } = await import('../dist/sensors/virtualSensorHumidity.js');
const { GarageDoor } = await import('../dist/accessories/virtualAccessoryGarageDoor.js');

const log = { info() {}, debug() {}, error() {} };

// A measurement sensor without HomeKit plumbing: only what updateMeasurementSensor() and getJsonState() use.
function measurementSensor(t, SensorClass, { accessoryIsStateful = true, value = 0 } = {}) {
  const fake = Object.create(SensorClass.prototype);
  let current = value;
  Object.assign(fake, {
    accessoryName: 'My Measurement Sensor',
    accessoryConfiguration: { accessoryID: '1234567', accessoryIsStateful },
    log,
    SensorUnits: 'celsius',
    MeasurementCharacteristic: {},
    service: { setCharacteristic: (characteristic, v) => (current = v) },
    getSensorValue: () => current,
    saveState: t.mock.fn(),
  });
  return fake;
}

test('stateful temperature and humidity sensors save their value on every webhook update', (t) => {
  for (const [SensorClass, reading] of [[TemperatureSensor, 23.5], [HumiditySensor, 61]]) {
    const s = measurementSensor(t, SensorClass);
    s.updateMeasurementSensor(reading, '1234567');
    assert.equal(s.saveState.mock.callCount(), 1, SensorClass.name);
    assert.equal(s.getJsonState(), JSON.stringify({ SensorValue: reading }), SensorClass.name);
  }
});

test('measurement sensors that are not stateful store nothing', (t) => {
  const s = measurementSensor(t, TemperatureSensor, { accessoryIsStateful: false });
  s.updateMeasurementSensor(18, '1234567');
  assert.equal(s.getJsonState(), '{}');
});

test('rejected webhook updates are not saved', (t) => {
  const s = measurementSensor(t, HumiditySensor);
  assert.throws(() => s.updateMeasurementSensor(40, '7654321'));
  assert.throws(() => s.updateMeasurementSensor('40', '1234567'));
  assert.equal(s.saveState.mock.callCount(), 0);
});

test('stored measurement values are read back defensively', () => {
  assert.equal(MeasurementSensor.getStoredSensorValue({ SensorValue: 21.5 }), 21.5);
  assert.equal(MeasurementSensor.getStoredSensorValue({ SensorValue: 0 }), 0);
  for (const json of [undefined, {}, { SensorValue: '21' }, { SensorValue: null }, { SensorValue: true }]) {
    assert.equal(MeasurementSensor.getStoredSensorValue(json), undefined, JSON.stringify(json));
  }
});

// Door states come from HAP, which is only wired up when the platform starts; use HAP's values.
const OPEN = 0;
const CLOSING = 3;

// A garage door without HomeKit plumbing: only what updateObstruction() and getJsonState() use.
function garageDoor(t, { doorState = OPEN } = {}) {
  t.mock.getter(GarageDoor, 'OPEN', () => OPEN);
  t.mock.getter(GarageDoor, 'CLOSING', () => CLOSING);
  const fake = Object.create(GarageDoor.prototype);
  let obstruction = GarageDoor.OBSTRUCTION_NOT_DETECTED;
  Object.assign(fake, {
    accessoryName: 'My Garage Door',
    accessoryConfiguration: { accessoryID: '1234567', accessoryIsStateful: true },
    log,
    stateStorageKey: 'GarageDoorState',
    obstructionStorageKey: 'ObstructionDetected',
    getCurrentDoorState: () => doorState,
    getTargetDoorState: () => doorState,
    getObstructionDetected: () => obstruction,
    updateObstructionDetected: (v) => (obstruction = v),
    saveState: t.mock.fn(),
  });
  return fake;
}

test('garage door obstruction set by webhook is saved with the door state', (t) => {
  const door = garageDoor(t);
  door.updateObstruction(true, '1234567');
  assert.equal(door.saveState.mock.callCount(), 1);
  assert.equal(door.getJsonState(), JSON.stringify({ GarageDoorState: OPEN, ObstructionDetected: true }));

  door.updateObstruction(false, '1234567');
  assert.equal(door.saveState.mock.callCount(), 2);
  assert.equal(door.getJsonState(), JSON.stringify({ GarageDoorState: OPEN, ObstructionDetected: false }));
});
