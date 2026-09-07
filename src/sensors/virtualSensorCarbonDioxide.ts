import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * CarbonDioxideSensor - Sensor implementation
 */
export class CarbonDioxideSensor extends BinarySensor {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.CarbonDioxideSensor;

  static readonly EVENT_DETECTED_CHARACTERISTIC: WithUUID<{ new (): Characteristic; }> = CharacteristicType.CarbonDioxideDetected;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return CarbonDioxideSensor.ACCESSORY_SERVICE_TYPE;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return CarbonDioxideSensor.EVENT_DETECTED_CHARACTERISTIC;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case CarbonDioxideSensor.CO2_LEVELS_NORMAL: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case CarbonDioxideSensor.CO2_LEVELS_ABNORMAL: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CO2_LEVELS_NORMAL: number =         CharacteristicType.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
  static readonly CO2_LEVELS_ABNORMAL: number =       CharacteristicType.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
}
