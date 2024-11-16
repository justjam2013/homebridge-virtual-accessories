import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { VirtualSensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualContactSensor extends VirtualSensor {

  static readonly CONTACT_DETECTED: number = 0;       // Characteristic.ContactSensorState.CONTACT_DETECTED;
  static readonly CONTACT_NOT_DETECTED: number = 1;   // Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.ContactSensor, platform.Characteristic.ContactSensorState, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case VirtualContactSensor.CONTACT_DETECTED: { sensorStateName = VirtualSensor.NORMAL_CLOSED; break; }
    case VirtualContactSensor.CONTACT_NOT_DETECTED: { sensorStateName = VirtualSensor.TRIGGERED_OPEN; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
