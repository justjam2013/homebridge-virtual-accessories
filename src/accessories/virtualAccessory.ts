import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from '../sensors/virtualSensor.js';

import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { VirtualAccessoriesLogger } from '../virtualLogger.js';

import fs from 'fs';

/**
 * Abstract Accessory
 */
export abstract class Accessory {
  service?: Service;

  readonly platform: VirtualAccessoriesPlatform;
  readonly accessory: PlatformAccessory;

  readonly accessoryConfiguration: AccessoryConfiguration;

  protected defaultState;

  protected storagePath: string;

  protected companionSensor?: Sensor;

  readonly log: VirtualAccessoriesLogger;
  readonly serviceType: WithUUID<typeof Service>;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    serviceType: WithUUID<typeof Service>,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    this.serviceType = serviceType;

    // The accessory configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.accessoryConfiguration = accessory.context.deviceConfiguration;
    this.log = new VirtualAccessoriesLogger(this.platform.log);

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.storagePath = accessory.context.storagePath;

    if (!this.accessoryConfiguration.accessoryIsStateful) {
      this.deleteAccessoryState(this.storagePath);
    }

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, `Virtual Accessory - ${this.getAccessoryTypeName()}`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID)
      .setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
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

  private saveAccessoryState(
    storagePath: string,
    stateJson: string,
  ): void {
    // Overwrite the existing persistence file
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Saving state: ${stateJson}`);
    fs.writeFile(
      storagePath,
      stateJson,
      { encoding: 'utf8', flag: 'w' },
      (error) => {
        if (error !== null) {
          this.log.error(`[${this.accessoryConfiguration.accessoryName}] Error saving state: ${error}`);
        } else {
          this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Saved state: ${stateJson}`);
        }
      },
    );
  }

  protected deleteAccessoryState(
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

  // Store device state if stateful
  protected storeState() {
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }
  }

  protected abstract getAccessoryTypeName(): string;

  protected abstract getJsonState(): string;
}
