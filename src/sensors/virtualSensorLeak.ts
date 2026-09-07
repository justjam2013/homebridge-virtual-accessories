import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * LeakSensor - Sensor implementation
 */
export class LeakSensor extends BinarySensor {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.LeakSensor;

  static readonly EVENT_DETECTED_CHARACTERISTIC: WithUUID<{ new (): Characteristic; }> = CharacteristicType.LeakDetected;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return LeakSensor.ACCESSORY_SERVICE_TYPE;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return LeakSensor.EVENT_DETECTED_CHARACTERISTIC;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case LeakSensor.LEAK_NOT_DETECTED: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case LeakSensor.LEAK_DETECTED: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly LEAK_NOT_DETECTED: number =       CharacteristicType.LeakDetected.LEAK_NOT_DETECTED;
  static readonly LEAK_DETECTED: number =           CharacteristicType.LeakDetected.LEAK_DETECTED;
}
