import type { PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';
import { VirtualSensor } from './virtualSensor.js';

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';

/**
 * Virtual Accessory
 * Abstract superclass for all virtual accessories and place to store common functionality
 */
export abstract class VirtualAccessory {
  protected service!: Service;

  protected readonly platform: VirtualAccessoryPlatform;
  protected readonly accessory: PlatformAccessory;

  protected CLOSED_NORMAL: number;   // 0
  protected OPEN_TRIGGERED: number;  // 1

  protected device;
  protected isStateful;
  protected defaultState;
  protected hasResetTimer;
  protected hasCompanionSensor;

  protected storagePath: string;

  protected timerId;
  protected companionSensor: VirtualSensor | undefined;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    this.CLOSED_NORMAL = this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;       // 0
    this.OPEN_TRIGGERED = this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;  // 1
  
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
    if (existsSync(storagePath)) {
      contents = readFileSync(storagePath, 'utf8');
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
    writeFileSync(
      storagePath,
      JSON.stringify({
        [key]: value,
      }),
      { encoding: 'utf8', flag: 'w' },
    );
  }

  protected deleteState(
    storagePath: string,
  ): void {
    if (existsSync(storagePath)) {
      try {
        unlinkSync(storagePath); 
      } catch (err) {
        // For now ignore
      }
    }
  }

  protected getCompanionSensorStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case this.CLOSED_NORMAL: { sensorStateName = 'NORMAL-CLOSED'; break; }
    case this.OPEN_TRIGGERED: { sensorStateName = 'TRIGGERED-OPEN'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
