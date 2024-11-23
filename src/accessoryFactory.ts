import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';

import { Accessory } from './accessories/virtualAccessory.js';
import { Switch } from './accessories/virtualAccessorySwitch.js';
import { Lock } from './accessories/virtualAccessoryLock.js';
import { Doorbell } from './accessories/virtualAccessoryDoorbell.js';
import { GarageDoor } from './accessories/virtualAccessoryGarageDoor.js';
import { WindowCovering } from './accessories/virtualAccessoryWindowCovering.js';

import { VirtualSensor } from './sensors/virtualSensor.js';
import { VirtualContactSensor } from './sensors/virtualSensorContact.js';
import { VirtualLeakSensor } from './sensors/virtualSensorLeak.js';
import { VirtualMotionSensor } from './sensors/virtualSensorMotion.js';
import { VirtualOccupancySensor } from './sensors/virtualSensorOccupancy.js';
import { VirtualSmokeSensor } from './sensors/virtualSensorSmoke.js';
import { VirtualCarbonDioxideSensor } from './sensors/virtualSensorCarbonDioxide.js';
import { VirtualCarbonMonoxideSensor } from './sensors/virtualSensorCarbonMonoxide.js';

import { Trigger } from './triggers/trigger.js';
import { PingTrigger } from './triggers/triggerPing.js';
import { CronTrigger } from './triggers/triggerCron.js';
import { AccessoryConfiguration } from './configuration/configurationAccessory.js';

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
    accessoryType: string,
  ): Accessory | undefined {
    let virtualAccessory: Accessory | undefined;

    const accessoryConfiguration: AccessoryConfiguration = accessory.context.deviceConfiguration;

    switch (accessoryType) {
    case 'switch':
      virtualAccessory = new Switch(platform, accessory);
      break;
    case 'lock':
      virtualAccessory = new Lock(platform, accessory);
      break;
    case 'doorbell':
      virtualAccessory = new Doorbell(platform, accessory);
      break;
    case 'garagedoor':
      virtualAccessory = new GarageDoor(platform, accessory);
      break;
    case 'windowcovering':
      virtualAccessory = new WindowCovering(platform, accessory);
      break;
    case 'sensor':
      virtualAccessory = AccessoryFactory.createVirtualSensor(platform, accessory, accessoryConfiguration.sensorType);
      break;
    default:
      platform.log.error('Error creating accessory. Invalid accessory type:', accessoryType);
    }

    return virtualAccessory;
  }

  static createVirtualCompanionSwitch(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    companionSwitchName: string,
  ): Switch | undefined {
    const virtualAccessory: Switch = new Switch(platform, accessory, companionSwitchName);
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

  static createTrigger(
    sensor: VirtualSensor,
    triggerType: string,
    name: string,
  ): Trigger | undefined {
    let trigger: Trigger | undefined;

    switch (triggerType) {
    case 'ping':
      trigger = new PingTrigger(sensor, name);
      break;
    case 'cron':
      trigger = new CronTrigger(sensor, name);
      break;
    default:
      sensor.platform.log.error('Error creating trigger. Invalid trigger type:', triggerType);
    }

    return trigger;
  }
}
