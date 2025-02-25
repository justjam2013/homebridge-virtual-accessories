import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ContactSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'ContactSensor';

  static readonly CONTACT_DETECTED: number = 0;       // Characteristic.ContactSensorState.CONTACT_DETECTED;
  static readonly CONTACT_NOT_DETECTED: number = 1;   // Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.ContactSensor, platform.Characteristic.ContactSensorState, companionSensorName);
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
