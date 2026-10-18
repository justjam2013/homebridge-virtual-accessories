import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { hap, persistedAccessory } from './helpers/persistedAccessory.js';

const { GarageDoor } = await import('../dist/accessories/virtualAccessoryGarageDoor.js');
const { OPEN, CLOSED, OPENING, CLOSING, STOPPED } = hap.Characteristic.CurrentDoorState;

function garage(t, defaultState = 'closed', accessoryIsStateful = true) {
  const fixture = persistedAccessory(t, GarageDoor, {
    accessoryIsStateful,
    garageDoor: { defaultState, transitionDuration: 1 },
  });
  const create = fixture.create;
  fixture.create = () => {
    const door = create();
    t.after(() => door.transitionTimer.stop());
    return door;
  };
  return fixture;
}

function assertRestart(fixture, state, obstruction, current = state) {
  assert.deepEqual(fixture.readState(), { GarageDoorState: current, TargetDoorState: state, ObstructionDetected: obstruction });
  const restored = fixture.create();
  assert.equal(restored.getCurrentDoorState(), state);
  assert.equal(restored.getTargetDoorState(), state);
  assert.equal(restored.getObstructionDetected(), obstruction);
  assert.equal(restored.transitionTimer.isTimerRunning(), false);
  return restored;
}

test('cached garage reinitialization does not duplicate write-response permission', (t) => {
  const fixture = garage(t);
  const door = fixture.create();
  const target = door.service.getCharacteristic(hap.Characteristic.TargetDoorState);
  const initialPermissions = [...target.props.perms];
  assert.equal(initialPermissions.filter(permission => permission === hap.Perms.WRITE_RESPONSE).length, 1);

  for (let initialization = 0; initialization < 2; initialization++) {
    const restored = new GarageDoor(door.platform, door.accessory, fixture.config);
    t.after(() => restored.transitionTimer.stop());
    assert.equal(restored.service.getCharacteristic(hap.Characteristic.TargetDoorState), target);
    assert.deepEqual(target.props.perms, initialPermissions);
  }
});

for (const [defaultState, state] of [['open', OPEN], ['closed', CLOSED]]) {
  test(`garage obstruction round trips while ${defaultState}`, (t) => {
    const fixture = garage(t, defaultState);
    const door = fixture.create();
    for (const value of [true, false]) {
      door.updateObstruction(value, fixture.config.accessoryID);
      assertRestart(fixture, state, value);
    }
  });
}

test('opening and closing persist their destination before completion', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const fixture = garage(t);
  const door = fixture.create();
  await door.setTargetDoorStateHandler(OPEN);
  assert.equal(door.getCurrentDoorState(), OPENING);
  assertRestart(fixture, OPEN, false, OPENING);
  door.updateObstruction(true, fixture.config.accessoryID);
  assertRestart(fixture, OPEN, true, OPENING);
  door.updateObstruction(false, fixture.config.accessoryID);
  assertRestart(fixture, OPEN, false, OPENING);
  t.mock.timers.tick(1000);
  assert.equal(door.getCurrentDoorState(), OPEN);
  const restored = assertRestart(fixture, OPEN, false);

  // Closing also saves its destination immediately, before any obstruction update.
  await restored.setTargetDoorStateHandler(CLOSED);
  assert.equal(restored.getCurrentDoorState(), CLOSING);
  assertRestart(fixture, CLOSED, false, CLOSING);
  t.mock.timers.tick(1000);
  assertRestart(fixture, CLOSED, false);
});

test('obstruction saves the reversal before restart and a blocked HomeKit close retains OPEN', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const fixture = garage(t, 'open');
  const door = fixture.create();
  await door.setTargetDoorStateHandler(CLOSED);
  assert.equal(door.getCurrentDoorState(), CLOSING);
  door.updateObstruction(true, fixture.config.accessoryID);
  assert.equal(door.getCurrentDoorState(), OPENING);
  assert.equal(door.getTargetDoorState(), OPEN);
  assertRestart(fixture, OPEN, true, OPENING);
  t.mock.timers.tick(1000);
  const restored = assertRestart(fixture, OPEN, true);
  await restored.service.getCharacteristic(hap.Characteristic.TargetDoorState).handleSetRequest(CLOSED);
  assert.equal(restored.getTargetDoorState(), OPEN);
  assertRestart(fixture, OPEN, true);
  assert.equal(restored.getCurrentDoorState(), OPEN);
  assert.equal(restored.transitionTimer.isTimerRunning(), false);
  restored.updateObstruction(false, fixture.config.accessoryID);
  await restored.setTargetDoorStateHandler(CLOSED);
  t.mock.timers.tick(1000);
  assertRestart(fixture, CLOSED, false);
});

for (const [defaultState, initial, target] of [['closed', CLOSED, OPEN], ['open', OPEN, CLOSED]]) {
  test(`obstruction updates on a stopped door retain its effective ${defaultState} target`, async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const fixture = garage(t, defaultState);
    const door = fixture.create();
    await door.setTargetDoorStateHandler(target);
    await door.setTargetDoorStateHandler(initial);
    assert.equal(door.getCurrentDoorState(), STOPPED);
    for (const obstruction of [true, false]) {
      door.updateObstruction(obstruction, fixture.config.accessoryID);
      assertRestart(fixture, initial, obstruction, STOPPED);
    }
    t.mock.timers.tick(1000);
    assert.equal(door.getCurrentDoorState(), STOPPED);
  });
}

test('garage rejects old moving snapshots and invalid obstruction values on restart', (t) => {
  const fixture = garage(t, 'closed');
  for (const state of [OPENING, CLOSING, STOPPED, -1, '0', null]) {
    fixture.writeState({ GarageDoorState: state, ObstructionDetected: true });
    const door = fixture.create();
    assert.equal(door.getCurrentDoorState(), CLOSED);
    assert.equal(door.getTargetDoorState(), CLOSED);
    assert.equal(door.getObstructionDetected(), true);
  }
  fixture.writeState({ GarageDoorState: OPEN, ObstructionDetected: 'true' });
  const door = fixture.create();
  assert.equal(door.getCurrentDoorState(), OPEN);
  assert.equal(door.getObstructionDetected(), false);
});

test('non-stateful garage does not retain obstruction or completed movement', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const fixture = garage(t, 'closed', false);
  const door = fixture.create();
  await door.setTargetDoorStateHandler(OPEN);
  door.updateObstruction(true, fixture.config.accessoryID);
  t.mock.timers.tick(1000);
  assert.equal(existsSync(fixture.storagePath), false);
  const restored = fixture.create();
  assert.equal(restored.getCurrentDoorState(), CLOSED);
  assert.equal(restored.getObstructionDetected(), false);
});

test('rejected obstruction updates do not overwrite garage state', (t) => {
  const fixture = garage(t);
  const door = fixture.create();
  door.updateObstruction(true, fixture.config.accessoryID);
  assert.throws(() => door.updateObstruction(false, 'other'));
  assert.throws(() => door.updateObstruction('false', fixture.config.accessoryID));
  assertRestart(fixture, CLOSED, true);
});


test('reversal from an initially closed door persists OPEN immediately', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const fixture = garage(t);
  const door = fixture.create();
  await door.setTargetDoorStateHandler(OPEN);
  await door.setTargetDoorStateHandler(CLOSED);
  assert.equal(door.getCurrentDoorState(), STOPPED);
  await door.setTargetDoorStateHandler(CLOSED);
  assert.equal(door.getCurrentDoorState(), CLOSING);
  door.updateObstruction(true, fixture.config.accessoryID);
  assertRestart(fixture, OPEN, true, OPENING);
  t.mock.timers.tick(1000);
  assert.equal(door.getCurrentDoorState(), OPEN);
  assertRestart(fixture, OPEN, true);
});

for (const [defaultState, fallback] of [['open', OPEN], ['closed', CLOSED]]) {
  test(`garage restores valid targets and legacy stable states with ${defaultState} default`, (t) => {
    const fixture = garage(t, defaultState);
    for (const state of [OPEN, CLOSED]) {
      for (const snapshot of [
        { GarageDoorState: state },
        { GarageDoorState: state === OPEN ? CLOSING : OPENING, TargetDoorState: state },
      ]) {
        fixture.writeState(snapshot);
        const door = fixture.create();
        assert.equal(door.getCurrentDoorState(), state);
        assert.equal(door.getTargetDoorState(), state);
        assert.equal(door.transitionTimer.isTimerRunning(), false);
      }
    }
    for (const invalid of [OPENING, CLOSING, STOPPED, -1, '0', null, true, {}]) {
      fixture.writeState({ GarageDoorState: fallback === OPEN ? CLOSED : OPEN, TargetDoorState: invalid });
      const door = fixture.create();
      assert.equal(door.getCurrentDoorState(), fallback);
      assert.equal(door.getTargetDoorState(), fallback);
      assert.equal(door.transitionTimer.isTimerRunning(), false);
    }
  });
}

test('blocked close while opening preserves the OPEN destination and running timer', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const fixture = garage(t);
  const door = fixture.create();
  const target = door.service.getCharacteristic(hap.Characteristic.TargetDoorState);
  await target.handleSetRequest(OPEN);
  door.updateObstruction(true, fixture.config.accessoryID);
  await target.handleSetRequest(CLOSED);
  assert.equal(target.value, OPEN);
  assert.equal(door.transitionTimer.isTimerRunning(), true);
  assertRestart(fixture, OPEN, true, OPENING);
  t.mock.timers.tick(1000);
  assertRestart(fixture, OPEN, true);
});

test('zero-duration movement saves the completed effective destination', async (t) => {
  const fixture = garage(t);
  fixture.config.garageDoor.transitionDuration = 0;
  const door = fixture.create();
  for (const state of [OPEN, CLOSED]) {
    await door.service.getCharacteristic(hap.Characteristic.TargetDoorState).handleSetRequest(state);
    assert.equal(door.getCurrentDoorState(), state);
    assertRestart(fixture, state, false);
  }
});
