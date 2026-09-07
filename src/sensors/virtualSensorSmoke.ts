import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * SmokeSensor - Sensor implementation
 */
export class SmokeSensor extends BinarySensor {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.SmokeSensor;

  static readonly EVENT_DETECTED_CHARACTERISTIC: WithUUID<{ new (): Characteristic; }> = CharacteristicType.SmokeDetected;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return SmokeSensor.ACCESSORY_SERVICE_TYPE;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return SmokeSensor.EVENT_DETECTED_CHARACTERISTIC;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case SmokeSensor.SMOKE_NOT_DETECTED: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case SmokeSensor.SMOKE_DETECTED: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly SMOKE_NOT_DETECTED: number =      CharacteristicType.SmokeDetected.SMOKE_NOT_DETECTED;
  static readonly SMOKE_DETECTED: number =          CharacteristicType.SmokeDetected.SMOKE_DETECTED;
}
