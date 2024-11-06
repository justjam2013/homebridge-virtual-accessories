import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';

import { VirtualAccessory } from './virtualAccessory.js';
import { VirtualSwitchAccessory } from './virtualAccessorySwitch.js';
import { VirtualLockAccessory } from './virtualAccessoryLock.js';
import { VirtualDoorbellAccessory } from './virtualAccessoryDoorbell.js';
import { VirtualGarageDoorAccessory } from './virtualAccessoryGarageDoor.js';

import { VirtualSensor } from './virtualSensor.js';
import { VirtualContactSensor } from './virtualSensorContact.js';
import { VirtualLeakSensor } from './virtualSensorLeak.js';
import { VirtualMotionSensor } from './virtualSensorMotion.js';
import { VirtualOccupancySensor } from './virtualSensorOccupancy.js';
import { VirtualSmokeSensor } from './virtualSensorSmoke.js';
import { VirtualCarbonDioxideSensor } from './virtualSensorCarbonDioxide.js';
import { VirtualCarbonMonoxideSensor } from './virtualSensorCarbonMonoxide.js';

/**
 * Virtual Accessory Factory
 * Factory class to create virtual accessories
 */
export abstract class AccessoryFactory {

  constructor(
  ) {
    // 
  }

  static createVirtualAccessory(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    type: string,
  ): VirtualAccessory | undefined {
    let virtualAccessory: VirtualAccessory | undefined;

    const accessoryConfig = accessory.context.deviceConfiguration;

    switch (type) {
    case 'switch':
      virtualAccessory = new VirtualSwitchAccessory(platform, accessory);
      break;
    case 'lock':
      virtualAccessory = new VirtualLockAccessory(platform, accessory);
      break;
    case 'doorbell':
      virtualAccessory = new VirtualDoorbellAccessory(platform, accessory);
      break;
    case 'garagedoor':
      virtualAccessory = new VirtualGarageDoorAccessory(platform, accessory);
      break;
    case 'sensor':
      virtualAccessory = AccessoryFactory.createVirtualSensor(platform, accessory, accessoryConfig.sensorType);
      break;
    default:
      platform.log.error('Error creating accessory. Invalid accessory type:', type);
    }

    return virtualAccessory;
  }

  static createVirtualCompanionSensor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    sensorType: string,
    companionSensorName: string,
  ): VirtualSensor | undefined {
    const companionSensor = AccessoryFactory.createSensor(platform, accessory, sensorType, companionSensorName);
    return companionSensor;
  }

  static createVirtualSensor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    sensorType: string,     
  ): VirtualSensor | undefined {
    const companionSensor = AccessoryFactory.createSensor(platform, accessory, sensorType);
    return companionSensor;
  }

  private static createSensor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    sensorType: string,     
    companionSensorName?: string,
  ): VirtualSensor | undefined {
    let virtualSensor: VirtualSensor | undefined;

    switch (sensorType) {
    case 'carbonDioxide':
      virtualSensor = new VirtualCarbonDioxideSensor(platform, accessory, companionSensorName);
      break;
    case 'carbonMonoxide':
      virtualSensor = new VirtualCarbonMonoxideSensor(platform, accessory, companionSensorName);
      break;
    case 'contact':
      virtualSensor = new VirtualContactSensor(platform, accessory, companionSensorName);
      break;
    case 'leak':
      virtualSensor = new VirtualLeakSensor(platform, accessory, companionSensorName);
      break;
    case 'motion':
      virtualSensor = new VirtualMotionSensor(platform, accessory, companionSensorName);
      break;
    case 'occupancy':
      virtualSensor = new VirtualOccupancySensor(platform, accessory, companionSensorName);
      break;
    case 'smoke':
      virtualSensor = new VirtualSmokeSensor(platform, accessory, companionSensorName);
      break;
    default:
      platform.log.error('Error creating sensor. Invalid sensor type:', sensorType);
    }

    return virtualSensor;
  }
}
