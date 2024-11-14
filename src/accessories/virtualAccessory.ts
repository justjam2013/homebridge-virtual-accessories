import type { PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';
import { Timer } from '../timer.js';

import fs from 'fs';

/**
 * Abstract Accessory Configuration
 */
export abstract class AccessoryConfig {
  accessoryID!: string;
  accessoryName!: string;
  accessoryType!: string;
  accessoryIsStateful: boolean = false;
  accessoryHasResetTimer: boolean = false;
  accessoryHasCompanionSensor: boolean = false;
}

/**
 * Abstract Accessory
 */
export abstract class Accessory {
  service?: Service;

  readonly platform: VirtualAccessoryPlatform;
  readonly accessory: PlatformAccessory;

  readonly CLOSED_NORMAL: number = 0;
  readonly OPEN_TRIGGERED: number = 1;

  readonly device;
  protected isStateful;
  protected defaultState;
  protected hasResetTimer;
  protected hasCompanionSensor;

  protected storagePath: string;

  protected timer?: Timer;
  protected companionSensor?: VirtualSensor;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    // The device configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.device = accessory.context.deviceConfiguration;

    this.platform.log.debug(`[${this.device.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.isStateful = this.device.accessoryIsStateful;
    this.hasResetTimer = this.device.accessoryHasResetTimer;
    this.hasCompanionSensor = this.device.accessoryHasCompanionSensor;

    this.storagePath = accessory.context.storagePath;

    if (!this.isStateful) {
      this.deleteState(this.storagePath);
    }
  }

  protected loadState(
    storagePath: string,
    key: string,
  ): boolean | number {
    let contents = '{}';
    if (fs.existsSync(storagePath)) {
      contents = fs.readFileSync(storagePath, 'utf8');
    }

    const json = JSON.parse(contents);

    this.platform.log.debug(`[${this.device.accessoryName}] Stored state: ${JSON.stringify(json)}`);
    return json[key];
  }

  protected saveState(
    storagePath: string,
    key: string,
    value: boolean | number,
  ): void {
    // Overwrite the existing persistence file
    this.platform.log.debug(`[${this.device.accessoryName}] Saving state: ${key} ${value}`);
    fs.writeFileSync(
      storagePath,
      JSON.stringify({
        [key]: value,
      }),
      { encoding: 'utf8', flag: 'w' },
    );
  }

  protected deleteState(
    storagePath: string,
  ) {
    if (fs.existsSync(storagePath)) {
      try {
        fs.unlinkSync(storagePath); 
      } catch (err) {
        // For now ignore
      }
    }
  }
}
