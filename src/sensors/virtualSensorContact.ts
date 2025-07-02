import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './sensor.js';

/**
 * ContactSensor - Sensor implementation
 */
export class ContactSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'ContactSensor';

  static readonly CONTACT_DETECTED: number = 0;       // Characteristic.ContactSensorState.CONTACT_DETECTED;
  static readonly CONTACT_NOT_DETECTED: number = 1;   // Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getService(): WithUUID<typeof Service> {
    return this.platform.Service.ContactSensor;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.ContactSensorState;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case ContactSensor.CONTACT_DETECTED: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case ContactSensor.CONTACT_NOT_DETECTED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return ContactSensor.ACCESSORY_TYPE_NAME;
  }
}
