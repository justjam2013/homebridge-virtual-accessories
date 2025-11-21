 
import type { PlatformAccessory } from 'homebridge';
import type { SerializedMatterAccessory } from 'homebridge';

import { HapOrMatterAccessory, VirtualAccessoriesPlatform } from './platform.js';

import { Accessory } from './accessories/accessory.js';
import { AirPurifier } from './accessories/virtualAccessoryAirPurifier.js';
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
import { Microphone } from './accessories/virtualAccessoryMicrophone.js';
import { SecuritySystem } from './accessories/virtualAccessorySecuritySystem.js';
import { SmartSpeaker } from './accessories/virtualAccessorySmartSpeaker.js';
//import { Speaker } from './accessories/virtualAccessorySpeaker.js';
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
import { StartupTrigger } from './sensors/triggers/triggerStartup.js';
import { SunEventsTrigger } from './sensors/triggers/triggerSunEvents.js';
import { WebhookTrigger } from './sensors/triggers/triggerWebhook.js';

import { AccessoryType, SensorType, TriggerType } from './configuration/schema.js';
import { AccessoryConfiguration } from './configuration/configurationAccessory.js';

import { MatterSwitch } from './accessories/matter/Switch.js';

/**
 * Virtual Accessory Factory
 * Factory class to create virtual accessories
 */
export abstract class AccessoryFactory {

  constructor(
  ) {
    // 
  }

  static createVirtualHapAccessory(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ): Accessory | undefined {
    let virtualAccessory: Accessory | undefined;

    const accessoryType: string = accessoryConfiguration.accessoryType;

    switch (accessoryType) {
    case AccessoryType.AirPurifier:
      virtualAccessory = new AirPurifier(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Battery:
      virtualAccessory = new Battery(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Door:
      virtualAccessory = new Door(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Doorbell:
      virtualAccessory = new Doorbell(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Fan:
      virtualAccessory = new Fan(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.FilterMaintenance:
      virtualAccessory = new FilterMaintenance(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.GarageDoor:
      virtualAccessory = new GarageDoor(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.HeaterCooler:
      virtualAccessory = new HeaterCooler(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.HumidifierDehumidifier:
      virtualAccessory = new HumidifierDehumidifier(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Lightbulb:
      virtualAccessory = new Lightbulb(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Lock:
      virtualAccessory = new Lock(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Microphone:
      virtualAccessory = new Microphone(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.SecuritySystem:
      virtualAccessory = new SecuritySystem(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Speaker:
      virtualAccessory = new SmartSpeaker(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Switch:
      virtualAccessory = new Switch(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Television:
      virtualAccessory = new Television(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Valve:
      virtualAccessory = new Valve(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Window:
      virtualAccessory = new Window(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.WindowCovering:
      virtualAccessory = new WindowCovering(platform, accessory, accessoryConfiguration);
      break;
    case AccessoryType.Sensor:
      virtualAccessory = AccessoryFactory.createVirtualSensor(platform, accessory, accessoryConfiguration);
      break;
    default:
      platform.log.error(`Error creating accessory. Invalid accessory type: ${accessoryType}`);
    }

    return virtualAccessory;
  }

  static createVirtualMatterAccessory(
    platform: VirtualAccessoriesPlatform,
    accessory: SerializedMatterAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ): Accessory | undefined {
    let virtualAccessory: Accessory | undefined;

    const accessoryType: string = accessoryConfiguration.accessoryType;

    switch (accessoryType) {
    case AccessoryType.Switch:
      virtualAccessory = new MatterSwitch(platform, accessory, accessoryConfiguration);
      break;
    default:
      platform.log.error(`Error creating accessory. Invalid accessory type: ${accessoryType}`);
    }

    return virtualAccessory;
  }


  static createVirtualSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ): Sensor | undefined {
    const sensorType: string = accessoryConfiguration.sensor.type;

    let virtualSensor: Sensor | undefined;

    switch (sensorType) {
    case SensorType.CarbonDioxide:
      virtualSensor = new CarbonDioxideSensor(platform, accessory, accessoryConfiguration);
      break;
    case SensorType.CarbonMonoxide:
      virtualSensor = new CarbonMonoxideSensor(platform, accessory, accessoryConfiguration);
      break;
    case SensorType.Contact:
      virtualSensor = new ContactSensor(platform, accessory, accessoryConfiguration);
      break;
    case SensorType.Leak:
      virtualSensor = new LeakSensor(platform, accessory, accessoryConfiguration);
      break;
    case SensorType.Motion:
      virtualSensor = new MotionSensor(platform, accessory, accessoryConfiguration);
      break;
    case SensorType.Occupancy:
      virtualSensor = new OccupancySensor(platform, accessory, accessoryConfiguration);
      break;
    case SensorType.Smoke:
      virtualSensor = new SmokeSensor(platform, accessory, accessoryConfiguration);
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
    case TriggerType.Cron:
      trigger = new CronTrigger(sensor, name);
      break;
    case TriggerType.Ping:
      trigger = new PingTrigger(sensor, name);
      break;
    case TriggerType.Startup:
      trigger = new StartupTrigger(sensor, name);
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
