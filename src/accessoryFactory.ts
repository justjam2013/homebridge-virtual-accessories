import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from './platform.js';

import { Accessory } from './accessories/accessory.js';
import { Battery } from './accessories/virtualAccessoryBattery.js';
import { Door } from './accessories/virtualAccessoryDoor.js';
import { Doorbell } from './accessories/virtualAccessoryDoorbell.js';
import { Fan } from './accessories/virtualAccessoryFan.js';
import { FilterMaintenance } from './accessories/virtualAccessoryFilterMaintenance.js';
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
import { Window } from './accessories/virtualAccessoryWindow.js';
import { WindowCovering } from './accessories/virtualAccessoryWindowCovering.js';

import { Sensor } from './sensors/sensor.js';
import { ContactSensor } from './sensors/virtualSensorContact.js';
import { LeakSensor } from './sensors/virtualSensorLeak.js';
import { MotionSensor } from './sensors/virtualSensorMotion.js';
import { OccupancySensor } from './sensors/virtualSensorOccupancy.js';
import { SmokeSensor } from './sensors/virtualSensorSmoke.js';
import { CarbonDioxideSensor } from './sensors/virtualSensorCarbonDioxide.js';
import { CarbonMonoxideSensor } from './sensors/virtualSensorCarbonMonoxide.js';

import { Trigger } from './sensors/triggers/trigger.js';
import { CronTrigger } from './sensors/triggers/triggerCron.js';
import { PingTrigger } from './sensors/triggers/triggerPing.js';
import { SunEventsTrigger } from './sensors/triggers/triggerSunEvents.js';
import { WebhookTrigger } from './sensors/triggers/triggerWebhook.js';

import { AccessoryType, SensorType, TriggerType } from './configuration/schema.js';
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
    case AccessoryType.Battery:
      virtualAccessory = new Battery(platform, accessory);
      break;
    case AccessoryType.Door:
      virtualAccessory = new Door(platform, accessory);
      break;
    case AccessoryType.Doorbell:
      virtualAccessory = new Doorbell(platform, accessory);
      break;
    case AccessoryType.Fan:
      virtualAccessory = new Fan(platform, accessory);
      break;
    case AccessoryType.FilterMaintenance:
      virtualAccessory = new FilterMaintenance(platform, accessory);
      break;
    case AccessoryType.GarageDoor:
      virtualAccessory = new GarageDoor(platform, accessory);
      break;
    case AccessoryType.HeaterCooler:
      virtualAccessory = new HeaterCooler(platform, accessory);
      break;
    case AccessoryType.HumidifierDehumidifier:
      virtualAccessory = new HumidifierDehumidifier(platform, accessory);
      break;
    case AccessoryType.Lightbulb:
      virtualAccessory = new Lightbulb(platform, accessory);
      break;
    case AccessoryType.Lock:
      virtualAccessory = new Lock(platform, accessory);
      break;
    case AccessoryType.SecuritySystem:
      virtualAccessory = new SecuritySystem(platform, accessory);
      break;
    case AccessoryType.Speaker:
      virtualAccessory = new Speaker(platform, accessory);
      break;
    case AccessoryType.Switch:
      virtualAccessory = new Switch(platform, accessory);
      break;
    case AccessoryType.Television:
      virtualAccessory = new Television(platform, accessory);
      break;
    case AccessoryType.Valve:
      virtualAccessory = new Valve(platform, accessory);
      break;
    case AccessoryType.Window:
      virtualAccessory = new Window(platform, accessory);
      break;
    case AccessoryType.WindowCovering:
      virtualAccessory = new WindowCovering(platform, accessory);
      break;
    case AccessoryType.Sensor:
      virtualAccessory = AccessoryFactory.createVirtualSensor(platform, accessory, accessoryConfiguration.sensor.type);
      break;
    default:
      platform.log.error(`Error creating accessory. Invalid accessory type: ${accessoryType}`);
    }

    return virtualAccessory;
  }

  static createVirtualSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    sensorType: string,     
  ): Sensor | undefined {
    let virtualSensor: Sensor | undefined;

    switch (sensorType) {
    case SensorType.CarbonDioxide:
      virtualSensor = new CarbonDioxideSensor(platform, accessory);
      break;
    case SensorType.CarbonMonoxide:
      virtualSensor = new CarbonMonoxideSensor(platform, accessory);
      break;
    case SensorType.Contact:
      virtualSensor = new ContactSensor(platform, accessory);
      break;
    case SensorType.Leak:
      virtualSensor = new LeakSensor(platform, accessory);
      break;
    case SensorType.Motion:
      virtualSensor = new MotionSensor(platform, accessory);
      break;
    case SensorType.Occupancy:
      virtualSensor = new OccupancySensor(platform, accessory);
      break;
    case SensorType.Smoke:
      virtualSensor = new SmokeSensor(platform, accessory);
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
    case TriggerType.Ping:
      trigger = new PingTrigger(sensor, name);
      break;
    case TriggerType.Cron:
      trigger = new CronTrigger(sensor, name);
      break;
    case TriggerType.SunEvents:
      trigger = new SunEventsTrigger(sensor, name);
      break;
    case TriggerType.Webhook:
      trigger = new WebhookTrigger(sensor, name);
      break;
    default:
      sensor.log.error('Error creating trigger. Invalid trigger type:', [triggerType]);
    }

    return trigger;
  }
}
