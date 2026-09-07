import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * CarbonMonoxideSensor - Sensor implementation
 */
export class CarbonMonoxideSensor extends BinarySensor {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.CarbonMonoxideSensor;

  static readonly EVENT_DETECTED_CHARACTERISTIC: WithUUID<{ new (): Characteristic; }> = CharacteristicType.CarbonMonoxideDetected;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return CarbonMonoxideSensor.ACCESSORY_SERVICE_TYPE;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return CarbonMonoxideSensor.EVENT_DETECTED_CHARACTERISTIC;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case CarbonMonoxideSensor.CO_LEVELS_NORMAL: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case CarbonMonoxideSensor.CO_LEVELS_ABNORMAL: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CO_LEVELS_NORMAL: number =          CharacteristicType.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
  static readonly CO_LEVELS_ABNORMAL: number =        CharacteristicType.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
}
