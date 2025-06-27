import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * SmokeSensor - Sensor implementation
 */
export class SmokeSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'SmokeSensor';

  static readonly SMOKE_NOT_DETECTED: number = 0;   // Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
  static readonly SMOKE_DETECTED: number = 1;       // Characteristic.SmokeDetected.SMOKE_DETECTED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getService(): WithUUID<typeof Service> {
    return this.platform.Service.SmokeSensor;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.SmokeDetected;
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case SmokeSensor.SMOKE_NOT_DETECTED: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case SmokeSensor.SMOKE_DETECTED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return SmokeSensor.ACCESSORY_TYPE_NAME;
  }
}
