/* global fetch */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { WebhookServer } from '../dist/webhookServer.js';

// Run after npm run build: node --test test/webhookServer.test.js
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
    for (const value of [null, { toString: 1 }, {}, [], ['true'], [{ toString: 1 }], 0, 1, '', 'invalid', undefined]) {
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
    for (const value of [true, false]) {
      for (const query of [false, true]) {
        await t.test(`${route} accepts ${query ? 'query' : 'JSON'} ${value}`, async () => {
          const before = updates.length;
          const response = await fetch(`${base}${route}${query ? `?id=a00005&${field}=${value}&charge=50` : ''}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Use-Query-Params': String(query) },
            body: JSON.stringify({ id: 'a00005', [field]: value, charge: 50 }),
          });
          assert.equal(response.status, 200);
          assert.equal(updates.length, before + 1);
          if (route === '/chargingstate') {
            assert.equal(updates.at(-1).charging, value);
          }
          else if (route === '/obstruction' || route === '/triggersensor') {
            assert.equal(updates.at(-1), value);
          }
        });
      }
    }
  }
});
