import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { persistedAccessory } from './helpers/persistedAccessory.js';

const { TemperatureSensor } = await import('../dist/sensors/virtualSensorTemperature.js');
const { HumiditySensor } = await import('../dist/sensors/virtualSensorHumidity.js');

for (const [SensorClass, units, reading, expected] of [
  [TemperatureSensor, 'c', 23.5, 23.5],
  [TemperatureSensor, 'f', 77, 25],
  [HumiditySensor, 'c', 61, 61],
]) {
  test(`${SensorClass.name} (${units}) saves and restores its HomeKit value`, (t) => {
    const fixture = persistedAccessory(t, SensorClass, {}, units);
    const sensor = fixture.create();
    sensor.updateMeasurementSensor(reading, fixture.config.accessoryID);
    assert.deepEqual(fixture.readState(), { SensorValue: expected });
    assert.equal(fixture.create().getSensorValue(), expected);
  });
}

test('TemperatureSensor ignores invalid stored values and restores zero', (t) => {
  const fixture = persistedAccessory(t, TemperatureSensor);
  const defaultValue = fixture.create().getSensorValue();
  for (const value of ['21', null, true, {}, []]) {
    fixture.writeState({ SensorValue: value });
    assert.equal(fixture.create().getSensorValue(), defaultValue);
  }
  fixture.writeState({});
  assert.equal(fixture.create().getSensorValue(), defaultValue);
  fixture.writeState({ SensorValue: 0 });
  assert.equal(fixture.create().getSensorValue(), 0);
});

for (const SensorClass of [TemperatureSensor, HumiditySensor]) {
  test(`${SensorClass.name} does not persist when non-stateful`, (t) => {
    const fixture = persistedAccessory(t, SensorClass, { accessoryIsStateful: false });
    fixture.writeState({ SensorValue: 35 });
    const sensor = fixture.create();
    const defaultValue = sensor.getSensorValue();
    sensor.updateMeasurementSensor(40, fixture.config.accessoryID);
    assert.equal(existsSync(fixture.storagePath), false);
    assert.equal(fixture.create().getSensorValue(), defaultValue);
  });

  test(`${SensorClass.name} rejected updates leave saved readings unchanged`, (t) => {
    const fixture = persistedAccessory(t, SensorClass);
    const sensor = fixture.create();
    sensor.updateMeasurementSensor(30, fixture.config.accessoryID);
    assert.throws(() => sensor.updateMeasurementSensor(40, 'other'));
    assert.throws(() => sensor.updateMeasurementSensor('40', fixture.config.accessoryID));
    assert.deepEqual(fixture.readState(), { SensorValue: 30 });
  });
}
