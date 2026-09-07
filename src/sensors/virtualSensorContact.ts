import type { PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * ContactSensor - Sensor implementation
 */
export class ContactSensor extends BinarySensor {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.ContactSensor, CharacteristicType.ContactSensorState);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case ContactSensor.CONTACT_DETECTED: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case ContactSensor.CONTACT_NOT_DETECTED: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CONTACT_DETECTED: number =            CharacteristicType.ContactSensorState.CONTACT_DETECTED;
  static readonly CONTACT_NOT_DETECTED: number =        CharacteristicType.ContactSensorState.CONTACT_NOT_DETECTED;
}
