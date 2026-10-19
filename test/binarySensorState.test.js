import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { hap, persistedAccessory } from './helpers/persistedAccessory.js';

const { MotionSensor } = await import('../dist/sensors/virtualSensorMotion.js');
const { OccupancySensor } = await import('../dist/sensors/virtualSensorOccupancy.js');

for (const [SensorClass, characteristic, type] of [
  [MotionSensor, hap.Characteristic.MotionDetected, 'boolean'],
  [OccupancySensor, hap.Characteristic.OccupancyDetected, 'number'],
]) {
  test(`${SensorClass.name} saves and restores both states through real HomeKit characteristics`, (t) => {
    const fixture = persistedAccessory(t, SensorClass, { sensor: { trigger: 'webhook' } });
    let sensor = fixture.create();
    assert.equal(sensor.getSensorState(), 0);
    for (const value of [true, false]) {
      sensor.getTrigger().triggerSensor(value, fixture.config.accessoryID);
      assert.equal(typeof sensor.service.getCharacteristic(characteristic).value, type);
      assert.deepEqual(fixture.readState(), { SensorState: Number(value) });
      sensor = fixture.create();
      assert.equal(sensor.getSensorState(), Number(value));
      assert.equal(sensor.service.getCharacteristic(characteristic).value, type === 'boolean' ? value : Number(value));
    }
  });
}

test('non-stateful sensors start inactive and do not save webhook updates', (t) => {
  const fixture = persistedAccessory(t, MotionSensor, { accessoryIsStateful: false, sensor: { trigger: 'webhook' } });
  const sensor = fixture.create();
  assert.equal(sensor.getSensorState(), 0);
  sensor.getTrigger().triggerSensor(true, fixture.config.accessoryID);
  assert.equal(sensor.getSensorState(), 1);
  assert.equal(existsSync(fixture.storagePath), false);
  assert.equal(fixture.create().getSensorState(), 0);
});

test('invalid binary updates leave the persisted state untouched', async (t) => {
  const fixture = persistedAccessory(t, MotionSensor, { sensor: { trigger: 'webhook' } });
  const sensor = fixture.create();
  sensor.getTrigger().triggerSensor(true, fixture.config.accessoryID);
  await assert.rejects(sensor.triggerSensorState(0, { sensorConfig: { accessoryID: 'other' } }));
  await assert.rejects(sensor.triggerSensorState(2, sensor.getTrigger()));
  assert.deepEqual(fixture.readState(), { SensorState: 1 });
});

test('startup sensors trigger and reset without persisting state', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = persistedAccessory(t, MotionSensor, { sensor: { trigger: 'startup' } });
  const sensor = fixture.create();
  assert.equal(sensor.getSensorState(), 0);
  t.mock.timers.tick(3000);
  await setImmediate();
  assert.equal(sensor.getSensorState(), 1);
  t.mock.timers.tick(3000);
  await setImmediate();
  assert.equal(sensor.getSensorState(), 0);
  assert.equal(existsSync(fixture.storagePath), false);
});
