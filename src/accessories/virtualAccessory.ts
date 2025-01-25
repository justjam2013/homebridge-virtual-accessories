import type { PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';

import fs from 'fs';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { VirtualLogger } from '../virtualLogger.js';

/**
 * Abstract Accessory
 */
export abstract class Accessory {
  service?: Service;

  readonly platform: VirtualAccessoryPlatform;
  readonly accessory: PlatformAccessory;

  readonly CLOSED_NORMAL: number = 0;
  readonly OPEN_TRIGGERED: number = 1;

  readonly accessoryConfiguration: AccessoryConfiguration;

  protected defaultState;

  protected storagePath: string;

  protected companionSensor?: VirtualSensor;

  readonly log: VirtualLogger;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    // The accessory configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.accessoryConfiguration = accessory.context.deviceConfiguration;
    this.log = new VirtualLogger(this.platform.log);

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.storagePath = accessory.context.storagePath;

    if (!this.accessoryConfiguration.accessoryIsStateful) {
      this.deleteState(this.storagePath);
    }
  }

  protected loadAccessoryState(
    storagePath: string,
  ): string {
    let contents = '{}';
    if (fs.existsSync(storagePath)) {
      contents = fs.readFileSync(storagePath, 'utf8');
    }

    const json = JSON.parse(contents);

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Loading state: ${JSON.stringify(json)}`);
    return json;
  }

  protected saveAccessoryState(
    storagePath: string,
    stateJson: string,
  ): void {
    // Overwrite the existing persistence file
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Saving state: ${stateJson}`);
    fs.writeFileSync(
      storagePath,
      stateJson,
      { encoding: 'utf8', flag: 'w' },
    );
  }

  protected deleteState(
    storagePath: string,
  ) {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Deleting state file ${storagePath}`);
    if (fs.existsSync(storagePath)) {
      try {
        fs.unlinkSync(storagePath); 
      } catch (err) {
        this.log.error(`[${this.accessoryConfiguration.accessoryName}] Error deleting state file ${storagePath}`);
      }
    }
  }
}
