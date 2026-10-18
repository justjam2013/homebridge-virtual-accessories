/* global fetch */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { URLSearchParams } from 'node:url';
import { test } from 'node:test';
import { hap, persistedAccessory } from './helpers/persistedAccessory.js';
import { Battery } from '../dist/accessories/virtualAccessoryBattery.js';
import { WebhookServer } from '../dist/webhookServer.js';
import { SecuritySystem } from '../dist/accessories/virtualAccessorySecuritySystem.js';
import { GarageDoor } from '../dist/accessories/virtualAccessoryGarageDoor.js';
import { MotionSensor } from '../dist/sensors/virtualSensorMotion.js';
import { TemperatureSensor } from '../dist/sensors/virtualSensorTemperature.js';
import { HumiditySensor } from '../dist/sensors/virtualSensorHumidity.js';

const C = hap.Characteristic;
const id = 'AbC-09';

async function fixture(t, AccessoryClass, config) {
  const persistence = persistedAccessory(t, AccessoryClass, { accessoryID: id, ...config });
  const accessory = persistence.create();
  const webhook = new WebhookServer({ info() {}, error() {}, debug() {} }, 0);
  webhook.addAccessory(accessory);
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  return {
    accessory,
    persistence,
    value: characteristic => accessory.service.getCharacteristic(characteristic).value,
    async request(path, options, status = 200) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', ...options });
      assert.equal(response.status, status, await response.text());
    },
  };
}

const json = fields => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...fields }) });
const form = fields => ({
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ id, ...fields }).toString(),
});
const query = { headers: { 'Use-Query-Params': 'true' } };

test('HTTP temperature and humidity updates reach HomeKit, including zero and percentage boundaries', async (t) => {
  const temperature = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  await temperature.request('/temperature', json({ value: 23.5 }));
  assert.equal(temperature.value(C.CurrentTemperature), 23.5);
  await temperature.request(`/temperature?id=${id}&value=0`, query);
  assert.equal(temperature.value(C.CurrentTemperature), 0);
  const humidity = await fixture(t, HumiditySensor, { accessoryType: 'measurement' });
  await humidity.request('/humidity', form({ value: 100 }));
  assert.equal(humidity.value(C.CurrentRelativeHumidity), 100);
  await humidity.request('/humidity', json({ value: 0 }));
  assert.equal(humidity.value(C.CurrentRelativeHumidity), 0);
});

test('HTTP temperature update is saved and restored to HomeKit after accessory recreation', async (t) => {
  const f = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  await f.request('/temperature', json({ value: 23.5 }));
  assert.equal(f.value(C.CurrentTemperature), 23.5);
  assert.deepEqual(f.persistence.readState(), { SensorValue: 23.5 });
  const restored = f.persistence.create();
  assert.equal(restored.service.getCharacteristic(C.CurrentTemperature).value, 23.5);
});

test('rejected HTTP humidity update preserves saved state after accessory recreation', async (t) => {
  const f = await fixture(t, HumiditySensor, { accessoryType: 'measurement' });
  await f.request('/humidity', json({ value: 61 }));
  const saved = f.persistence.readState();
  assert.deepEqual(saved, { SensorValue: 61 });
  await f.request('/humidity', json({ value: 101 }), 400);
  assert.equal(f.value(C.CurrentRelativeHumidity), 61);
  assert.deepEqual(f.persistence.readState(), saved);
  const restored = f.persistence.create();
  assert.equal(restored.service.getCharacteristic(C.CurrentRelativeHumidity).value, 61);
  assert.deepEqual(f.persistence.readState(), saved);
});

test('webhook registration dispatches sensor activation and reset through its real trigger', async (t) => {
  const f = await fixture(t, MotionSensor, { accessoryType: 'sensor', sensor: { trigger: 'webhook' } });
  await f.request('/triggersensor', form({ value: 'TrUe' }));
  assert.equal(f.value(C.MotionDetected), true);
  await f.request(`/triggersensor?id=${id}&value=false`, query);
  assert.equal(f.value(C.MotionDetected), false);
});

test('garage obstruction can be set and cleared over HTTP', async (t) => {
  const f = await fixture(t, GarageDoor, { accessoryType: 'garagedoor', garageDoor: { defaultState: 'open' } });
  t.after(() => f.accessory.transitionTimer.stop());
  await f.request('/obstruction', json({ value: true }));
  assert.equal(f.value(C.ObstructionDetected), true);
  await f.request('/obstruction', form({ value: false }));
  assert.equal(f.value(C.ObstructionDetected), false);
});

test('armed alarms activate and false does not reset an alarm', async (t) => {
  const f = await fixture(t, SecuritySystem, { accessoryType: 'securitysystem', securitySystem: { defaultState: 'armedstay' } });
  assert.equal(f.value(C.SecuritySystemCurrentState), C.SecuritySystemCurrentState.STAY_ARM);
  await f.request('/triggeralarm', json({ value: true }));
  assert.equal(f.value(C.SecuritySystemCurrentState), C.SecuritySystemCurrentState.ALARM_TRIGGERED);
  await f.request('/triggeralarm', json({ value: false }));
  assert.equal(f.value(C.SecuritySystemCurrentState), C.SecuritySystemCurrentState.ALARM_TRIGGERED);
});

test('disarmed alarms ignore ordinary triggers but accept panic', async (t) => {
  const f = await fixture(t, SecuritySystem, { accessoryType: 'securitysystem', securitySystem: { defaultState: 'disarmed' } });
  await f.request('/triggeralarm', form({ value: true }));
  assert.equal(f.value(C.SecuritySystemCurrentState), C.SecuritySystemCurrentState.DISARMED);
  await f.request(`/triggerpanic?id=${id}&value=true`, query);
  assert.equal(f.value(C.SecuritySystemCurrentState), C.SecuritySystemCurrentState.ALARM_TRIGGERED);
  await f.request('/triggerpanic', json({ value: false }));
  assert.equal(f.value(C.SecuritySystemCurrentState), C.SecuritySystemCurrentState.ALARM_TRIGGERED);
});

test('battery partial updates preserve omitted characteristics and accept both false and zero', async (t) => {
  const f = await fixture(t, Battery, { accessoryType: 'battery', battery: { isRechargeable: true } });
  await f.request('/chargingstate', json({ charging: true }));
  assert.equal(f.value(C.ChargingState), C.ChargingState.CHARGING);
  assert.equal(f.value(C.BatteryLevel), 100);
  await f.request('/chargingstate', form({ charge: 42 }));
  assert.equal(f.value(C.ChargingState), C.ChargingState.CHARGING);
  assert.equal(f.value(C.BatteryLevel), 42);
  await f.request(`/chargingstate?id=${id}&charging=false&charge=0`, query);
  assert.equal(f.value(C.ChargingState), C.ChargingState.NOT_CHARGING);
  assert.equal(f.value(C.BatteryLevel), 0);
});

test('invalid battery updates reject the entire request without changing either characteristic', async (t) => {
  const f = await fixture(t, Battery, { accessoryType: 'battery', battery: { isRechargeable: true } });
  for (const fields of [{}, { charging: 'true', charge: 42 }, { charging: true, charge: 101 }]) {
    await f.request('/chargingstate', json(fields), 400);
    assert.equal(f.value(C.ChargingState), C.ChargingState.NOT_CHARGING);
    assert.equal(f.value(C.BatteryLevel), 100);
  }
});

test('parameter selection uses body by default or false, and query for true', async (t) => {
  const f = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  for (const [header, bodyValue, expected] of [[undefined, 21, 21], ['false', 22, 22], [' \tTrUe\t ', 23, 30]]) {
    const options = json({ value: bodyValue });
    if (header !== undefined) { options.headers['Use-Query-Params'] = header; }
    await f.request(`/temperature?id=${id}&value=30`, options);
    assert.equal(f.value(C.CurrentTemperature), expected);
  }
  const options = json({ value: 40 });
  options.headers['Use-Query-Params'] = 'yes';
  await f.request(`/temperature?id=${id}&value=50`, options, 400);
  assert.equal(f.value(C.CurrentTemperature), 30);
});

test('missing or unparsed selected parameters leave the accessory unchanged', async (t) => {
  const f = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  for (const options of [{}, { headers: { 'Content-Type': 'text/plain' }, body: `id=${id}&value=40` }]) {
    await f.request(`/temperature?id=${id}&value=40`, options, 400);
    assert.equal(f.value(C.CurrentTemperature), 20);
  }
  const options = json({ value: 40 });
  options.headers['Use-Query-Params'] = 'true';
  await f.request('/temperature', options, 400);
  assert.equal(f.value(C.CurrentTemperature), 20);
});

test('malformed IDs and structured IDs are rejected without updating HomeKit', async (t) => {
  const f = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  for (const invalidId of [undefined, 'bad', 'invalid id', 12345, { toString: 1 }]) {
    await f.request('/temperature', json({ id: invalidId, value: 40 }), 400);
    assert.equal(f.value(C.CurrentTemperature), 20);
  }
  await f.request(`/temperature?id=${id}&id=other&value=40`, query, 400);
  await f.request('/temperature', { ...form({}), body: 'id[toString]=1&value=40' }, 400);
  assert.equal(f.value(C.CurrentTemperature), 20);
});

test('invalid booleans and structured values leave motion unchanged', async (t) => {
  const f = await fixture(t, MotionSensor, { accessoryType: 'sensor', sensor: { trigger: 'webhook' } });
  for (const options of [json({ value: 'true' }), json({ value: 1 }), json({ value: null }), form({ value: ' true' }),
    { ...form({}), body: `id=${id}&value[toString]=1` }]) {
    await f.request('/triggersensor', options, 400);
    assert.equal(f.value(C.MotionDetected), false);
  }
  await f.request(`/triggersensor?id=${id}&value=true&value=false`, query, 400);
  assert.equal(f.value(C.MotionDetected), false);
});

test('invalid numeric values and percentages leave readings unchanged', async (t) => {
  const f = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  for (const options of [json({ value: '40' }), json({ value: [40] }), form({ value: '12oops' }), form({ value: '9'.repeat(400) })]) {
    await f.request('/temperature', options, 400);
    assert.equal(f.value(C.CurrentTemperature), 20);
  }
  const humidity = await fixture(t, HumiditySensor, { accessoryType: 'measurement' });
  for (const value of [-1, 101, 75.5]) {
    await humidity.request('/humidity', json({ value }), 400);
    assert.equal(humidity.value(C.CurrentRelativeHumidity), 50);
  }
});

test('unknown and incompatible accessory IDs return 404 without changing registered state', async (t) => {
  const f = await fixture(t, TemperatureSensor, { accessoryType: 'measurement' });
  await f.request('/temperature', json({ id: 'unknown', value: 40 }), 404);
  await f.request('/obstruction', json({ value: true }), 404);
  assert.equal(f.value(C.CurrentTemperature), 20);
});
