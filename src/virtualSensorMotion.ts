import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';
import { VirtualSensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualMotionSensor extends VirtualSensor {

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.MotionSensor, platform.Characteristic.MotionDetected, companionSensorName);
  }
}
