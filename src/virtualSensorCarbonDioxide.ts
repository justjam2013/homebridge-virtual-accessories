import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';
import { VirtualSensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualCarbonDioxideSensor extends VirtualSensor {

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.CarbonDioxideSensor, platform.Characteristic.CarbonDioxideDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL: { sensorStateName = 'NORMAL-CLOSED'; break; }
    case this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL: { sensorStateName = 'TRIGGERED-OPEN'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
