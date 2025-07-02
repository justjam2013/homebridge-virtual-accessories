import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Sensor } from './sensor.js';

/**
 * LeakSensor - Sensor implementation
 */
export class LeakSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'LeakSensor';

  static readonly LEAK_NOT_DETECTED: number = 0;  // Characteristic.LeakDetected.LEAK_NOT_DETECTED;
  static readonly LEAK_DETECTED: number = 1;      // Characteristic.LeakDetected.LEAK_DETECTED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getService(): WithUUID<typeof Service> {
    return this.platform.Service.LeakSensor;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.LeakDetected;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case LeakSensor.LEAK_NOT_DETECTED: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case LeakSensor.LEAK_DETECTED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return LeakSensor.ACCESSORY_TYPE_NAME;
  }
}
