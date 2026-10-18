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
    for (const value of [true, false]) {
      sensor.getTrigger().triggerSensor(value, fixture.config.accessoryID);
      assert.equal(typeof sensor.service.getCharacteristic(characteristic).value, type);
      assert.deepEqual(fixture.readState(), { SensorState: Number(value) });
      sensor = fixture.create();
      assert.equal(sensor.getSensorState(), Number(value));
      assert.equal(sensor.service.getCharacteristic(characteristic).value, type === 'boolean' ? value : Number(value));

      // A repeated webhook must not write again, including for Boolean characteristics.
      const save = t.mock.method(sensor, 'saveState');
      sensor.getTrigger().triggerSensor(value, fixture.config.accessoryID);
      assert.equal(save.mock.callCount(), 0);
      save.mock.restore();
    }
  });
}

test('legacy Boolean states restore, while invalid binary states use the default', (t) => {
  const fixture = persistedAccessory(t, MotionSensor, { sensor: { trigger: 'webhook' } });
  for (const [stored, expected] of [[true, 1], [false, 0], [1, 1], [0, 0], [2, 0], ['1', 0], [null, 0], [{}, 0]]) {
    fixture.writeState({ SensorState: stored });
    assert.equal(fixture.create().getSensorState(), expected, JSON.stringify(stored));
  }
  fixture.writeState({});
  assert.equal(fixture.create().getSensorState(), 0);
});

test('non-stateful sensors delete old state and do not save webhook updates', (t) => {
  const fixture = persistedAccessory(t, MotionSensor, { accessoryIsStateful: false, sensor: { trigger: 'webhook' } });
  fixture.writeState({ SensorState: 1 });
  const sensor = fixture.create();
  assert.equal(sensor.getSensorState(), 0);
  sensor.getTrigger().triggerSensor(true, fixture.config.accessoryID);
  assert.equal(existsSync(fixture.storagePath), false);
  assert.equal(fixture.create().getSensorState(), 0);
});

for (const trigger of ['cron', 'ping', 'sunevents', undefined, 'missing sensor']) {
  test(`${trigger ?? 'unconfigured'} sensors neither restore nor overwrite webhook state`, async (t) => {
    const fixture = persistedAccessory(t, OccupancySensor, {
      sensor: trigger === 'missing sensor' ? undefined : { trigger },
      cronTrigger: { isDisabled: true },
      pingTrigger: { isDisabled: true },
      sunEventsTrigger: { isDisabled: true },
    });
    fixture.writeState({ SensorState: 1 });
    const sensor = fixture.create();
    assert.equal(sensor.getSensorState(), 0);
    const source = sensor.getTrigger() ?? { sensorConfig: fixture.config };
    await sensor.triggerSensorState(1, source);
    await sensor.triggerSensorState(0, source);
    assert.deepEqual(fixture.readState(), { SensorState: 1 });
  });
}

test('invalid binary updates leave the persisted state untouched', async (t) => {
  const fixture = persistedAccessory(t, MotionSensor, { sensor: { trigger: 'webhook' } });
  const sensor = fixture.create();
  sensor.getTrigger().triggerSensor(true, fixture.config.accessoryID);
  await assert.rejects(sensor.triggerSensorState(0, { sensorConfig: { accessoryID: 'other' } }));
  await assert.rejects(sensor.triggerSensorState(2, sensor.getTrigger()));
  assert.deepEqual(fixture.readState(), { SensorState: 1 });
});


test('startup sensors recompute their state without restoring or saving it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = persistedAccessory(t, MotionSensor, { sensor: { trigger: 'startup' } });
  fixture.writeState({ SensorState: 1 });
  const sensor = fixture.create();
  assert.equal(sensor.getSensorState(), 0);
  t.mock.timers.tick(3000);
  await setImmediate();
  assert.equal(sensor.getSensorState(), 1);
  t.mock.timers.tick(3000);
  await setImmediate();
  assert.equal(sensor.getSensorState(), 0);
  assert.deepEqual(fixture.readState(), { SensorState: 1 });
});
