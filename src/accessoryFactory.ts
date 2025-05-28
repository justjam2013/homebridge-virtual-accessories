import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from './platform.js';

import { Accessory } from './accessories/virtualAccessory.js';
import { Doorbell } from './accessories/virtualAccessoryDoorbell.js';
import { Fan } from './accessories/virtualAccessoryFan.js';
import { GarageDoor } from './accessories/virtualAccessoryGarageDoor.js';
import { HeaterCooler } from './accessories/virtualAccessoryHeaterCooler.js';
import { HumidifierDehumidifier } from './accessories/virtualAccessoryHumidifierDehumidifier.js';
import { Lightbulb } from './accessories/virtualAccessoryLightbulb.js';
import { Lock } from './accessories/virtualAccessoryLock.js';
import { SecuritySystem } from './accessories/virtualAccessorySecuritySystem.js';
import { Speaker } from './accessories/virtualAccessorySpeaker.js';
import { Switch } from './accessories/virtualAccessorySwitch.js';
import { Television } from './accessories/virtualAccessoryTelevision.js';
import { Valve } from './accessories/virtualAccessoryValve.js';
import { WindowCovering } from './accessories/virtualAccessoryWindowCovering.js';

import { InputSource } from './accessories/virtualAccessoryInputSource.js';

import { Sensor } from './sensors/virtualSensor.js';
import { ContactSensor } from './sensors/virtualSensorContact.js';
import { LeakSensor } from './sensors/virtualSensorLeak.js';
import { MotionSensor } from './sensors/virtualSensorMotion.js';
import { OccupancySensor } from './sensors/virtualSensorOccupancy.js';
import { SmokeSensor } from './sensors/virtualSensorSmoke.js';
import { CarbonDioxideSensor } from './sensors/virtualSensorCarbonDioxide.js';
import { CarbonMonoxideSensor } from './sensors/virtualSensorCarbonMonoxide.js';

import { Trigger } from './triggers/trigger.js';
import { CronTrigger } from './triggers/triggerCron.js';
import { PingTrigger } from './triggers/triggerPing.js';
import { SunEventsTrigger } from './triggers/triggerSunEvents.js';

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
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryType: string,
  ): Accessory | undefined {
    let virtualAccessory: Accessory | undefined;

    const accessoryConfiguration: AccessoryConfiguration = accessory.context.deviceConfiguration;

    switch (accessoryType) {
    case 'doorbell':
      virtualAccessory = new Doorbell(platform, accessory);
      break;
    case 'fan':
      virtualAccessory = new Fan(platform, accessory);
      break;
    case 'garagedoor':
      virtualAccessory = new GarageDoor(platform, accessory);
      break;
    case 'heatercooler':
      virtualAccessory = new HeaterCooler(platform, accessory);
      break;
    case 'humidifierdehumidifier':
      virtualAccessory = new HumidifierDehumidifier(platform, accessory);
      break;
    case 'lightbulb':
      virtualAccessory = new Lightbulb(platform, accessory);
      break;
    case 'lock':
      virtualAccessory = new Lock(platform, accessory);
      break;
    case 'securitysystem':
      virtualAccessory = new SecuritySystem(platform, accessory);
      break;
    case 'speaker':
      virtualAccessory = new Speaker(platform, accessory);
      break;
    case 'switch':
      virtualAccessory = new Switch(platform, accessory);
      break;
    case 'television':
      virtualAccessory = new Television(platform, accessory);
      break;
    case 'valve':
      virtualAccessory = new Valve(platform, accessory);
      break;
    case 'windowcovering':
      virtualAccessory = new WindowCovering(platform, accessory);
      break;
    case 'sensor':
      virtualAccessory = AccessoryFactory.createVirtualSensor(platform, accessory, accessoryConfiguration.sensor.type);
      break;
    default:
      platform.log.error(`Error creating accessory. Invalid accessory type: ${accessoryType}`);
    }

    return virtualAccessory;
  }

  static createVirtualCompanionSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    sensorType: string,
    companionSensorName: string,
  ): Sensor | undefined {
    const companionSensor = AccessoryFactory.createSensor(platform, accessory, sensorType, companionSensorName);
    return companionSensor;
  }

  static createVirtualSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    sensorType: string,     
  ): Sensor | undefined {
    const companionSensor = AccessoryFactory.createSensor(platform, accessory, sensorType);
    return companionSensor;
  }

  private static createSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    sensorType: string,     
    companionSensorName?: string,
  ): Sensor | undefined {
    let virtualSensor: Sensor | undefined;

    switch (sensorType) {
    case 'carbonDioxide':
      virtualSensor = new CarbonDioxideSensor(platform, accessory, companionSensorName);
      break;
    case 'carbonMonoxide':
      virtualSensor = new CarbonMonoxideSensor(platform, accessory, companionSensorName);
      break;
    case 'contact':
      virtualSensor = new ContactSensor(platform, accessory, companionSensorName);
      break;
    case 'leak':
      virtualSensor = new LeakSensor(platform, accessory, companionSensorName);
      break;
    case 'motion':
      virtualSensor = new MotionSensor(platform, accessory, companionSensorName);
      break;
    case 'occupancy':
      virtualSensor = new OccupancySensor(platform, accessory, companionSensorName);
      break;
    case 'smoke':
      virtualSensor = new SmokeSensor(platform, accessory, companionSensorName);
      break;
    default:
      platform.log.error(`Error creating sensor. Invalid sensor type: ${sensorType}`);
    }

    return virtualSensor;
  }

  static createTrigger(
    sensor: Sensor,
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
    case 'sunevents':
      trigger = new SunEventsTrigger(sensor, name);
      break;
    default:
      sensor.log.error('Error creating trigger. Invalid trigger type:', [triggerType]);
    }

    return trigger;
  }

  static createInputSource(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    inputName: string,
  ): InputSource {
    const inputSource = new InputSource(platform, accessory, inputName);
    return inputSource;
  }
}
