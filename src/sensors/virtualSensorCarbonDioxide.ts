import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * CarbonDioxideSensor - Sensor implementation
 */
export class CarbonDioxideSensor extends BinarySensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'CarbonDioxideSensor';

  static readonly CO2_LEVELS_NORMAL: number = 0;    // Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
  static readonly CO2_LEVELS_ABNORMAL: number = 1;  // Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getService(): WithUUID<typeof Service> {
    return this.platform.Service.CarbonDioxideSensor;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CarbonDioxideDetected;
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

  protected getAccessoryTypeName(): string {
    return CarbonDioxideSensor.ACCESSORY_TYPE_NAME;
  }
}
