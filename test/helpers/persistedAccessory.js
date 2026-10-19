import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import * as hap from '@homebridge/hap-nodejs';

// Initialize the accessory graph before importing the platform.
await import('../../dist/accessories/virtualAccessoryBattery.js');
const { VirtualAccessoriesPlatform } = await import('../../dist/platform.js');
const { PlatformAccessory } = await import(new URL('./platformAccessory.js', import.meta.resolve('homebridge')));

export { hap };

export function persistedAccessory(t, AccessoryClass, configuration = {}, tempUnits = 'c') {
  const directory = mkdtempSync(join(tmpdir(), 'virtual-accessory-state-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const storagePath = join(directory, 'state.json');
  const configPath = join(directory, 'config.json');
  writeFileSync(configPath, JSON.stringify({ platforms: [{ platform: 'config', tempUnits }] }));
  const log = { info() {}, debug() {}, warn() {}, error() {} };
  const listeners = process.listeners('warning');
  const platform = new VirtualAccessoriesPlatform(log, { name: VirtualAccessoriesPlatform.platformName }, {
    hap,
    on() {},
    user: { configPath: () => configPath },
  });
  const addedListeners = process.listeners('warning').filter(listener => !listeners.includes(listener));
  t.after(() => addedListeners.forEach(listener => process.removeListener('warning', listener)));
  const config = { accessoryID: '1234567', accessoryName: 'Test accessory', accessoryIsStateful: true, ...configuration };

  return {
    storagePath,
    config,
    readState: () => JSON.parse(readFileSync(storagePath, 'utf8')),
    writeState: state => writeFileSync(storagePath, JSON.stringify(state)),
    create() {
      const accessory = new PlatformAccessory(config.accessoryName, hap.uuid.generate(config.accessoryID));
      accessory.context = { storagePath, firmwareVersion: '3.17.6' };
      return new AccessoryClass(platform, accessory, config);
    },
  };
}
