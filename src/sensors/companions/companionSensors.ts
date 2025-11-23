/* eslint-disable @typescript-eslint/no-explicit-any */

import { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../../platform.js';
import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';

import { BinarySensor } from '../binarySensor.js';
import { SensorType } from '../../configuration/schema.js';
import { Accessory } from '../../accessories/accessory.js';
import { AccessoryNotAllowedError } from '../../errors.js';

import { MotionSensor } from '../virtualSensorMotion.js';
import { CarbonDioxideSensor } from '../virtualSensorCarbonDioxide.js';
import { CarbonMonoxideSensor } from '../virtualSensorCarbonMonoxide.js';
import { ContactSensor } from '../virtualSensorContact.js';
import { LeakSensor } from '../virtualSensorLeak.js';
import { OccupancySensor } from '../virtualSensorOccupancy.js';
import { SmokeSensor } from '../virtualSensorSmoke.js';

export interface TriggerableCompanionSensor {
  triggerCompanionSensorState(sensorState: number, accessory: Accessory, isLoggingDisabled: boolean): void;
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
    case SensorType.CarbonDioxide:
      virtualSensor = new CompanionCarbonDioxideSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case SensorType.CarbonMonoxide:
      virtualSensor = new CompanionCarbonMonoxideSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case SensorType.Contact:
      virtualSensor = new CompanionContactSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case SensorType.Leak:
      virtualSensor = new CompanionLeakSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case SensorType.Motion:
      virtualSensor = new CompanionMotionSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case SensorType.Occupancy:
      virtualSensor = new CompanionOccupancySensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    case SensorType.Smoke:
      virtualSensor = new CompanionSmokeSensor(platform, accessory, accessoryConfiguration, companionSensorName);
      break;
    default:
      platform.log.error(`Error creating sensor. Invalid sensor type: ${sensorType}`);
    }

    return virtualSensor;
  }
}

// Mixin

function Companion<T extends abstract new (...args: any[]) => BinarySensor>(
  SensorInstance: T,
) {
  abstract class CompanionSensor extends SensorInstance implements TriggerableCompanionSensor {

    private uuidPostfix: string = '-sensor';

    companionConstructor(companionSensorName: string): void {
      // Replace the Sensor Service
      const sensorService: WithUUID<typeof Service> = this.getService();
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
    async triggerCompanionSensorState(sensorState: number, accessory: Accessory, isLoggingDisabled: boolean = false) {
      if (accessory.accessory.UUID !== this.accessory.UUID) {
        throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
      }

      this.states.SensorState = sensorState;

      this.service!.updateCharacteristic(this.eventDetected, (this.states.SensorState));

      // eslint-disable-next-line max-len
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${BinarySensor.getStateName(this.states.SensorState)}`, isLoggingDisabled);
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

    this.companionConstructor(companionSensorName);
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

    this.companionConstructor(companionSensorName);
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

    this.companionConstructor(companionSensorName);
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

    this.companionConstructor(companionSensorName);
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

    this.companionConstructor(companionSensorName);
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

    this.companionConstructor(companionSensorName);
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

    this.companionConstructor(companionSensorName);
  }
}
