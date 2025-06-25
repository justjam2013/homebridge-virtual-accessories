/* eslint-disable @typescript-eslint/no-explicit-any */

import { PlatformAccessory, Service, WithUUID } from 'homebridge';
import { VirtualAccessoriesPlatform } from '../platform.js';

import { Sensor } from '../sensors/virtualSensor.js';
import { SensorType } from '../configuration/configurationSchema.js';
import { Accessory } from '../accessories/virtualAccessory.js';
import { AccessoryNotAllowedError } from '../errors.js';

import { MotionSensor } from '../sensors/virtualSensorMotion.js';
import { CarbonDioxideSensor } from '../sensors/virtualSensorCarbonDioxide.js';
import { CarbonMonoxideSensor } from '../sensors/virtualSensorCarbonMonoxide.js';
import { ContactSensor } from '../sensors/virtualSensorContact.js';
import { LeakSensor } from '../sensors/virtualSensorLeak.js';
import { OccupancySensor } from '../sensors/virtualSensorOccupancy.js';
import { SmokeSensor } from '../sensors/virtualSensorSmoke.js';

export interface TriggerableCompanionSensor {
  triggerCompanionSensorState(sensorState: number, accessory: Accessory, isLoggingDisabled: boolean): void;
}

export class CompanionSensor {

  static getTriggerableCompanionSensor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    sensorType: string,
    companionSensorName: string,
  ): TriggerableCompanionSensor | undefined {
    let virtualSensor: TriggerableCompanionSensor | undefined;

    switch (sensorType) {
    case SensorType.CarbonDioxide:
      virtualSensor = new CompanionCarbonDioxideSensor(platform, accessory, companionSensorName);
      break;
    case SensorType.CarbonMonoxide:
      virtualSensor = new CompanionCarbonMonoxideSensor(platform, accessory, companionSensorName);
      break;
    case SensorType.Contact:
      virtualSensor = new CompanionContactSensor(platform, accessory, companionSensorName);
      break;
    case SensorType.Leak:
      virtualSensor = new CompanionLeakSensor(platform, accessory, companionSensorName);
      break;
    case SensorType.Motion:
      virtualSensor = new CompanionMotionSensor(platform, accessory, companionSensorName);
      break;
    case SensorType.Occupancy:
      virtualSensor = new CompanionOccupancySensor(platform, accessory, companionSensorName);
      break;
    case SensorType.Smoke:
      virtualSensor = new CompanionSmokeSensor(platform, accessory, companionSensorName);
      break;
    default:
      platform.log.error(`Error creating sensor. Invalid sensor type: ${sensorType}`);
    }

    return virtualSensor;
  }
}

// Mixin

function Companion<T extends abstract new (...args: any[]) => Sensor>(
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
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${Sensor.getStateName(this.states.SensorState)}`, isLoggingDisabled);
    }
  };
  return CompanionSensor;
}

class CompanionCarbonDioxideSensor extends Companion(CarbonDioxideSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}

class CompanionCarbonMonoxideSensor extends Companion(CarbonMonoxideSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}

class CompanionContactSensor extends Companion(ContactSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}

class CompanionLeakSensor extends Companion(LeakSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}

class CompanionMotionSensor extends Companion(MotionSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}

class CompanionOccupancySensor extends Companion(OccupancySensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}

class CompanionSmokeSensor extends Companion(SmokeSensor) {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName: string,
  ) {
    super(platform, accessory);

    this.companionConstructor(companionSensorName);
  }
}
