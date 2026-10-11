/* global fetch */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { URLSearchParams } from 'node:url';
import { test } from 'node:test';
import { Battery } from '../dist/accessories/virtualAccessoryBattery.js';
import { WebhookServer } from '../dist/webhookServer.js';
import { SecurityServiceTriggerType } from '../dist/accessories/virtualAccessorySecuritySystem.js';

// Run with npm test (builds the source before testing).
test('accessory IDs reject malformed HTTP input without dispatching updates', async (t) => {
  const webhook = new WebhookServer({ info() {}, error() {}, debug() {} }, 0);
  const updates = [];
  webhook.processRequest = (route, id, types, value, response) => {
    updates.push({ route, id });
    response.sendStatus(200);
  };
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const routes = ['/humidity', '/temperature', '/obstruction', '/triggeralarm', '/triggerpanic', '/triggersensor', '/chargingstate'];

  for (const route of routes) {
    const fields = route === '/chargingstate' ? { charging: false, charge: 0 }
      : { value: route === '/humidity' || route === '/temperature' ? 0 : false };
    const invalidIds = [
      [{ toString: 1 }, 'object'], [{}, 'object'], [[], 'object'], [['a00005'], 'object'],
      [[{ toString: 1 }], 'object'], [null, 'null'], [12345, '12345'], [false, 'false'],
      [undefined, 'undefined'], ['', ''], ['abcd', 'abcd'], ['invalid id', 'invalid id'],
    ];
    for (const [id, description] of invalidIds) {
      await t.test(`${route} rejects JSON id ${JSON.stringify(id)}`, async () => {
        const before = updates.length;
        const response = await fetch(`${base}${route}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...fields }),
        });
        assert.equal(response.status, 400);
        assert.equal(await response.text(), `Invalid accessory id: ${description}`);
        assert.equal(updates.length, before);
      });
    }
    for (const mode of ['query', 'form']) {
      for (const id of ['id[toString]=1', 'id[]=a00005', 'id[0][toString]=1', 'id=a00005&id=b00006']) {
        await t.test(`${route} rejects ${mode} ${id}`, async () => {
          const before = updates.length;
          const encoded = `${id}&${new URLSearchParams(fields)}`;
          const options = mode === 'query' ? { headers: { 'Use-Query-Params': 'true' } }
            : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encoded };
          const response = await fetch(`${base}${route}${mode === 'query' ? `?${encoded}` : ''}`, { method: 'POST', ...options });
          assert.equal(response.status, 400);
          assert.match(await response.text(), /^Invalid accessory id: (object|undefined)$/);
          assert.equal(updates.length, before);
        });
      }
    }
    for (const mode of ['JSON', 'query', 'form']) {
      for (const id of ['a00005', '12345', 'AbC-09']) {
        await t.test(`${route} accepts ${mode} string id ${id}`, async () => {
          const before = updates.length;
          const payload = { id, ...fields };
          const encoded = new URLSearchParams(payload).toString();
          const options = mode === 'query' ? { headers: { 'Use-Query-Params': 'true' } }
            : mode === 'JSON' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
              : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encoded };
          const response = await fetch(`${base}${route}${mode === 'query' ? `?${encoded}` : ''}`, { method: 'POST', ...options });
          assert.equal(response.status, 200, await response.text());
          assert.equal(updates.length, before + 1);
          assert.deepEqual(updates.at(-1), { route, id });
        });
      }
    }
  }
});

test('boolean webhook validation rejects malformed values and preserves valid booleans', async (t) => {
  const webhook = new WebhookServer({ info() {}, error() {}, debug() {} }, 0);
  const updates = [];
  webhook.processRequest = (route, id, types, value, response) => {
    updates.push(value);
    response.sendStatus(200);
  };
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  for (const route of ['/obstruction', '/triggeralarm', '/triggerpanic', '/triggersensor', '/chargingstate']) {
    const field = route === '/chargingstate' ? 'charging' : 'value';
    const invalid = [null, { toString: 1 }, {}, [], [true], [false], ['true'], [{ toString: 1 }],
      0, 1, '', 'invalid', 'true', 'false', 'TRUE', 'False', undefined];
    for (const value of invalid) {
      // An omitted charging field is valid when charge is supplied.
      if (route === '/chargingstate' && value === undefined) {
        continue;
      }
      await t.test(`${route} rejects ${JSON.stringify(value)}`, async () => {
        const before = updates.length;
        const response = await fetch(`${base}${route}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'a00005', [field]: value, charge: 50 }),
        });
        assert.equal(response.status, 400);
        assert.match(await response.text(), /^Invalid value: .*\. Value must be a boolean$/);
        assert.equal(updates.length, before);
      });
    }
    for (const mode of ['query', 'form']) {
      for (const value of ['', ' ', ' true', 'false ', 'true\n', '1', '0', 'yes', 'null', 'undefined']) {
        await t.test(`${route} rejects ${mode} boolean ${JSON.stringify(value)}`, async () => {
          const before = updates.length;
          const encoded = new URLSearchParams({ id: 'a00005', [field]: value, charge: 50 }).toString();
          const options = mode === 'query' ? { headers: { 'Use-Query-Params': 'true' } }
            : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encoded };
          const response = await fetch(`${base}${route}${mode === 'query' ? `?${encoded}` : ''}`, { method: 'POST', ...options });
          assert.equal(response.status, 400, await response.text());
          assert.equal(updates.length, before);
        });
      }
    }
    for (const value of [true, false, 'true', 'false', 'TRUE', 'FALSE', 'True', 'False']) {
      const expected = String(value).toLowerCase() === 'true';
      for (const mode of ['JSON', 'query', 'form']) {
        if (mode === 'JSON' && typeof value !== 'boolean') {
          continue;
        }
        const query = mode === 'query';
        await t.test(`${route} accepts ${mode} ${value}`, async () => {
          const before = updates.length;
          const response = await fetch(`${base}${route}${query ? `?id=a00005&${field}=${value}&charge=50` : ''}`, {
            method: 'POST',
            headers: { 'Content-Type': mode === 'form' ? 'application/x-www-form-urlencoded' : 'application/json', 'Use-Query-Params': String(query) },
            body: mode === 'form' ? new URLSearchParams({ id: 'a00005', [field]: value, charge: 50 }).toString()
              : JSON.stringify({ id: 'a00005', [field]: value, charge: 50 }),
          });
          assert.equal(response.status, 200);
          assert.equal(updates.length, before + 1);
          if (route === '/chargingstate') {
            assert.equal(updates.at(-1).charging, expected);
          }
          else if (route === '/obstruction' || route === '/triggersensor') {
            assert.equal(updates.at(-1), expected);
          }
          else {
            const trigger = route === '/triggeralarm' ? SecurityServiceTriggerType.TriggerAlarm : SecurityServiceTriggerType.TriggerPanic;
            assert.equal(updates.at(-1), expected ? trigger : SecurityServiceTriggerType.None);
          }
        });
      }
    }
  }
});

test('webhook routes handle missing bodies before reading fields', async (t) => {
  const webhook = new WebhookServer({ info() {}, error() {}, debug() {} }, 0);
  const updates = [];
  webhook.processRequest = (route, id, types, value, response) => {
    updates.push({ route, id, value });
    response.sendStatus(200);
  };
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const routes = ['/humidity', '/temperature', '/obstruction', '/triggeralarm', '/triggerpanic', '/triggersensor', '/chargingstate'];
  const missingBodies = [
    ['no body or content type', {}],
    ['empty JSON body', { headers: { 'Content-Type': 'application/json' } }],
    ['unparsed text body', { headers: { 'Content-Type': 'text/plain' }, body: 'id=a00005&value=true' }],
    ['empty JSON object', { headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ];
  for (const route of routes) {
    for (const [label, options] of missingBodies) {
      await t.test(`${route} rejects ${label}`, async () => {
        const before = updates.length;
        const response = await fetch(`${base}${route}?id=a00005&value=true&charging=true&charge=50`, {
          method: 'POST', ...options,
        });
        assert.equal(response.status, 400);
        assert.equal(await response.text(), 'No parameters found in POST body');
        assert.equal(updates.length, before);
      });
    }
    await t.test(`${route} rejects empty query mode without a body`, async () => {
      const before = updates.length;
      const response = await fetch(`${base}${route}`, {
        method: 'POST', headers: { 'Use-Query-Params': 'true' },
      });
      assert.equal(response.status, 400);
      assert.equal(await response.text(), 'No parameters found in POST query. The webhook server is using query parameters');
      assert.equal(updates.length, before);
    });
    const numeric = route === '/humidity' || route === '/temperature';
    const payload = route === '/chargingstate'
      ? { id: 'a00005', charging: false, charge: 0 }
      : { id: 'a00005', value: numeric ? 0 : false };
    for (const mode of ['JSON', 'query', 'form']) {
      await t.test(`${route} preserves ${mode} updates`, async () => {
        const before = updates.length;
        const query = new URLSearchParams(payload).toString();
        const options = mode === 'query'
          ? { headers: { 'Use-Query-Params': 'true' } }
          : mode === 'JSON'
            ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
            : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: query };
        const response = await fetch(`${base}${route}${mode === 'query' ? `?${query}` : ''}`, {
          method: 'POST', ...options,
        });
        assert.equal(response.status, 200);
        assert.equal(updates.length, before + 1);
        assert.equal(updates.at(-1).id, payload.id);
        assert.equal(updates.at(-1).route, route);
        const actual = updates.at(-1).value;
        if (route === '/chargingstate') {
          assert.equal(actual.charging, false);
          assert.equal(actual.charge, 0);
        }
        else {
          const alarm = route === '/triggeralarm' || route === '/triggerpanic';
          assert.equal(actual, numeric ? 0 : alarm ? SecurityServiceTriggerType.None : false);
        }
      });
    }
  }
});


test('charging updates preserve omitted battery properties', async (t) => {
  // Homebridge normally initializes these characteristic constants at startup.
  t.mock.getter(Battery, 'NOT_CHARGING', () => 0);
  t.mock.getter(Battery, 'CHARGING', () => 1);
  t.mock.getter(Battery, 'NOT_CHARGEABLE', () => 2);
  const log = { info() {}, error() {}, debug() {} };
  const webhook = new WebhookServer(log, 0);
  const updates = [];
  const state = { charging: true, charge: 42 };
  // Exercise real route dispatch and Battery.updateChargingStatus without HomeKit setup.
  const battery = {
    log,
    accessoryConfiguration: { accessoryID: 'a00005', accessoryType: 'battery' },
    getChargingState: () => state.charging ? Battery.CHARGING : Battery.NOT_CHARGING,
    updateChargingState(value) {
      state.charging = value === Battery.CHARGING;
      return value;
    },
    updateBatteryLevel(value) {
      state.charge = value;
      return value;
    },
    saveState() {},
    updateChargingStatus(charging, charge, id) {
      updates.push({ charging, charge, id });
      Battery.prototype.updateChargingStatus.call(this, charging, charge, id);
    },
  };
  webhook.addAccessory(battery);
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/chargingstate`;
  const cases = [
    ['charge only', { charge: 75 }, 200],
    ['zero charge', { charge: 0 }, 200],
    ['full charge', { charge: 100 }, 200],
    ['charging only', { charging: true }, 200],
    ['not charging', { charging: false }, 200],
    ['both properties', { charge: 75, charging: false }, 200],
    ['both falsy values', { charge: 0, charging: false }, 200],
    ['neither property', {}, 400],
    ['invalid charging alone', { charging: 'invalid' }, 400],
    ['invalid charging with charge', { charging: 'invalid', charge: 75 }, 400],
    ['null charge alone', { charge: null }, 400],
    ['null charge with charging', { charge: null, charging: false }, 400],
    ['array charging with charge', { charging: [true], charge: 0 }, 400],
    ['fractional charge', { charge: 75.5 }, 400],
    ['negative charge', { charge: -1, charging: false }, 400],
    ['excess charge', { charge: 101, charging: false }, 400],
    ['invalid charge alone', { charge: 'invalid' }, 400],
    ['invalid charge with charging', { charge: 'invalid', charging: false }, 400],
  ];
  for (const mode of ['JSON', 'query', 'form']) {
    for (const [label, fields, status] of cases) {
      if (mode !== 'JSON' && Array.isArray(fields.charging)) {
        continue;
      }
      await t.test(`${mode}: ${label}`, async () => {
        Object.assign(state, { charging: true, charge: 42 });
        const before = updates.length;
        const payload = { id: 'a00005', ...fields };
        const query = new URLSearchParams(payload).toString();
        const options = mode === 'query'
          ? { headers: { 'Use-Query-Params': 'true' } }
          : mode === 'JSON'
            ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
            : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: query };
        const response = await fetch(`${base}${mode === 'query' ? `?${query}` : ''}`, { method: 'POST', ...options });
        assert.equal(response.status, status, await response.text());
        assert.equal(updates.length, before + (status === 200 ? 1 : 0));
        if (status === 200) {
          assert.deepEqual(updates.at(-1), { id: payload.id, charging: fields.charging, charge: fields.charge });
          assert.deepEqual(state, { charging: true, charge: 42, ...fields });
        }
        else {
          assert.deepEqual(state, { charging: true, charge: 42 });
        }
      });
    }
  }
});


test('Use-Query-Params headers reject invalid values and select the requested parameter source', async (t) => {
  const webhook = new WebhookServer({ info() {}, error() {}, debug() {} }, 0);
  const updates = [];
  webhook.processRequest = (route, id, types, value, response) => {
    updates.push({ route, id });
    response.sendStatus(200);
  };
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const routes = ['/humidity', '/temperature', '/obstruction', '/triggeralarm', '/triggerpanic', '/triggersensor', '/chargingstate'];
  for (const route of routes) {
    const payload = { id: 'body-id', value: route === '/humidity' || route === '/temperature' ? 50 : true, charge: 50, charging: true };
    const query = new URLSearchParams({ ...payload, id: 'query-id' });
    for (const header of ['yes', '1', '', '   ', 'true,false', 'tru e']) {
      for (const withBody of [true, false]) {
        await t.test(`${route} rejects header ${JSON.stringify(header)} ${withBody ? 'with' : 'without'} body`, async () => {
          const before = updates.length;
          const response = await fetch(`${base}${route}?${query}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Use-Query-Params': header },
            ...(withBody ? { body: JSON.stringify(payload) } : {}),
          });
          assert.equal(response.status, 400);
          assert.equal(await response.text(), 'Invalid Use-Query-Params header. Value must be true or false');
          assert.equal(updates.length, before);
        });
      }
    }
    for (const header of [undefined, 'true', 'TRUE', 'True', 'false', 'FALSE', 'False', ' \tTrUe\t ', ' \tFaLsE\t ']) {
      for (const name of ['Use-Query-Params', 'use-query-params', 'UsE-QuErY-PaRaMs']) {
        await t.test(`${route} accepts ${name}: ${JSON.stringify(header)}`, async () => {
          const before = updates.length;
          const response = await fetch(`${base}${route}?${query}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(header === undefined ? {} : { [name]: header }) },
            body: JSON.stringify(payload),
          });
          assert.equal(response.status, 200, await response.text());
          assert.equal(updates.length, before + 1);
          assert.deepEqual(updates.at(-1), { route, id: header?.trim().toLowerCase() === 'true' ? 'query-id' : 'body-id' });
        });
      }
    }
  }
});

test('numeric webhook inputs require finite scalar numbers', async (t) => {
  const webhook = new WebhookServer({ info() {}, error() {}, debug() {} }, 0);
  const updates = [];
  webhook.processRequest = (route, id, types, value, response) => {
    updates.push(value);
    response.sendStatus(200);
  };
  const server = webhook.server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/humidity', '/temperature', '/chargingstate']) {
    const field = route === '/chargingstate' ? 'charge' : 'value';
    const invalid = [
      null, true, false, [], [0], [50], ['50'], {}, { toString: 1 }, { valueOf: 0 },
      '50', '50.5', '', ' \t ', 'NaN', 'Infinity', '-Infinity', '1e309', '12oops',
    ];
    for (const value of invalid) {
      await t.test(`${route} rejects JSON ${JSON.stringify(value)}`, async () => {
        const before = updates.length;
        const response = await fetch(`${base}${route}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'a00005', [field]: value, charging: false }),
        });
        assert.equal(response.status, 400);
        assert.match(await response.text(), /Value must be a finite number/);
        assert.equal(updates.length, before);
      });
    }
    for (const mode of ['JSON', 'query', 'form']) {
      // Expected validity is explicit, independent of the implementation's parsing rules.
      const cases = [
        [0, true, true], [75, true, true], [100, true, true],
        [72.5, false, true], [-5.5, false, true], [-1, false, true], [101, false, true],
        ['0', true, true], ['75', true, true], ['100', true, true], ['+75', true, true], ['075', true, true],
        ['-0', true, true], ['75.0', false, true], ['72.5', false, true], ['-5.5', false, true],
        ['.5', false, true], ['5.', false, true], ['+72.5', false, true],
        ['-1', false, true], ['101', false, true],
        ...[' 25 ', '', ' ', 'NaN', 'Infinity', '-Infinity', '1e309', '1e1', '0x10', '0b10', '12oops', 'true', '75\n', '75\r', '75\t', '9'.repeat(400)]
          .map(value => [value, false, false]),
      ];
      for (const [value, percentageValid, numberValid] of cases) {
        await t.test(`${route} ${mode} scalar ${JSON.stringify(value)}`, async () => {
          const before = updates.length;
          const payload = { id: 'a00005', [field]: value };
          const encoded = new URLSearchParams(payload).toString();
          const options = mode === 'query' ? { headers: { 'Use-Query-Params': 'true' } }
            : mode === 'JSON' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
              : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encoded };
          const response = await fetch(`${base}${route}${mode === 'query' ? `?${encoded}` : ''}`, { method: 'POST', ...options });
          const valid = (mode !== 'JSON' || typeof value === 'number') &&
            (route === '/temperature' ? numberValid : percentageValid);
          assert.equal(response.status, valid ? 200 : 400, await response.text());
          assert.equal(updates.length, before + (valid ? 1 : 0));
          if (valid) {
            if (route === '/chargingstate') {
              assert.equal(updates.at(-1).charge, Number(value));
              assert.equal(updates.at(-1).charging, undefined);
            }
            else {
              assert.equal(updates.at(-1), Number(value));
            }
          }
        });
      }
    }
  }
  for (const route of ['/humidity', '/temperature', '/obstruction', '/triggeralarm', '/triggerpanic', '/triggersensor', '/chargingstate']) {
    const fields = route === '/chargingstate' ? ['charge', 'charging'] : ['value'];
    for (const field of fields) {
      const scalar = field === 'charge' || route === '/humidity' || route === '/temperature' ? '50' : 'true';
      for (const mode of ['query', 'form']) {
        const shapes = mode === 'query' ? [`${field}=${scalar}&${field}=${scalar}`]
          : [`${field}=${scalar}&${field}=${scalar}`, `${field}[]=${scalar}`, `${field}[toString]=1`];
        for (const shape of shapes) {
          await t.test(`${route} rejects ${mode} structured ${shape}`, async () => {
            const before = updates.length;
            const encoded = `id=a00005&${shape}`;
            const options = mode === 'query' ? { headers: { 'Use-Query-Params': 'true' } }
              : { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encoded };
            const response = await fetch(`${base}${route}${mode === 'query' ? `?${encoded}` : ''}`, { method: 'POST', ...options });
            assert.equal(response.status, 400, await response.text());
            assert.equal(updates.length, before);
          });
        }
      }
    }
  }
});
