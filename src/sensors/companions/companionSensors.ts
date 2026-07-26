/* eslint-disable @typescript-eslint/no-explicit-any */

import { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../../platform.js';
import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';

import { BinarySensor } from '../binarySensor.js';
import { BinarySensorType } from '../../configuration/schema.js';
import { Accessory } from '../../accessories/accessory.js';
import { AccessoryNotAllowedError } from '../../errors.js';

import { MotionSensor } from '../virtualSensorMotion.js';
import { CarbonDioxideSensor } from '../virtualSensorCarbonDioxide.js';
import { CarbonMonoxideSensor } from '../virtualSensorCarbonMonoxide.js';
import { ContactSensor } from '../virtualSensorContact.js';
import { LeakSensor } from '../virtualSensorLeak.js';
import { OccupancySensor } from '../virtualSensorOccupancy.js';
import { SmokeSensor } from '../virtualSensorSmoke.js';
import { TriggeredState } from '../sensorCharacteristics.js';

export interface TriggerableCompanionSensor {
  triggerCompanionSensorState(sensorState: number, accessory: Accessory<typeof Service>, isLoggingDisabled: boolean): void;
}

export class CompanionSensor {

  static getTriggerableCompanionSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ): TriggerableCompanionSensor | undefined {
    const sensorType: string = accessoryConfiguration.companionSensor.type;
    const companionSensorName: string = accessoryConfiguration.companionSensor.name;

    let virtualSensor: TriggerableCompanionSensor | undefined;

    switch (sensorType) {
    case BinarySensorType.CarbonDioxide:
      virtualSensor = new CompanionCarbonDioxideSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case BinarySensorType.CarbonMonoxide:
      virtualSensor = new CompanionCarbonMonoxideSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case BinarySensorType.Contact:
      virtualSensor = new CompanionContactSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case BinarySensorType.Leak:
      virtualSensor = new CompanionLeakSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case BinarySensorType.Motion:
      virtualSensor = new CompanionMotionSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case BinarySensorType.Occupancy:
      virtualSensor = new CompanionOccupancySensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case BinarySensorType.Smoke:
      virtualSensor = new CompanionSmokeSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    default:
      platform.log.error(`Error creating sensor. Invalid sensor type: ${sensorType}`);
    }

    return virtualSensor;
  }

  static getCompanionSensorServiceUUIDs(
    platform: VirtualAccessoriesPlatform,
  ): string[] {
    const companionSensorServiceUUIDs: string[] =
    [
      platform.Service.CarbonDioxideSensor.UUID,
      platform.Service.CarbonMonoxideSensor.UUID,
      platform.Service.ContactSensor.UUID,
      platform.Service.LeakSensor.UUID,
      platform.Service.MotionSensor.UUID,
      platform.Service.OccupancySensor.UUID,
      platform.Service.SmokeSensor.UUID,
    ];
    return companionSensorServiceUUIDs;
  }
}

// Mixin

function Companion<T extends abstract new (...args: any[]) => BinarySensor<typeof Service.Switch>>(
  SensorInstance: T,
) {
  abstract class CompanionSensor extends SensorInstance implements TriggerableCompanionSensor {

    private uuidPostfix: string = '-sensor';

    companionConstructor(
      companionSensorName: string,
      sensorService: WithUUID<typeof Service>,
    ): void {
      // Replace the Sensor Service
      //const sensorService: WithUUID<typeof Service> = this.getPrimaryService();
      const service = this.accessory.getService(sensorService);
      if (service !== undefined) {
        this.accessory.removeService(service);
      }

      this.service = this.accessory.getService(companionSensorName!) ||
                   this.accessory.addService(sensorService, companionSensorName, this.accessory.UUID + this.uuidPostfix);

      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSensorName!);

      this.trigger = undefined;
    }

    /**
     * This method is called by the accessory that has this sensor as a companion
     */
    async triggerCompanionSensorState(sensorState: number, accessory: Accessory<typeof Service>, isLoggingDisabled: boolean = false) {
      if (accessory.accessory.UUID !== this.accessory.UUID) {
        throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryName} is not allowed to trigger this sensor`);
      }

      this.State = sensorState;

      this.service!.updateCharacteristic(this.eventDetected, (this.State));

       
      this.log.info(`[${this.accessoryName}] Setting Sensor Current State: ${TriggeredState.getName(this.State)}`, isLoggingDisabled);
    }
  };
  return CompanionSensor;
}

class CompanionCarbonDioxideSensor extends Companion(CarbonDioxideSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.CarbonDioxideSensor);
  }
}

class CompanionCarbonMonoxideSensor extends Companion(CarbonMonoxideSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.CarbonMonoxideSensor);
  }
}

class CompanionContactSensor extends Companion(ContactSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.ContactSensor);
  }
}

class CompanionLeakSensor extends Companion(LeakSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.LeakSensor);
  }
}

class CompanionMotionSensor extends Companion(MotionSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.MotionSensor);
  }
}

class CompanionOccupancySensor extends Companion(OccupancySensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.OccupancySensor);
  }
}

class CompanionSmokeSensor extends Companion(SmokeSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    companionSensorName: string,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.companionConstructor(companionSensorName, platform.Service.SmokeSensor);
  }
}
