import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from '../accessories/virtualAccessory.js';
import { AccessoryFactory } from '../accessoryFactory.js';
import { Trigger } from '../triggers/trigger.js';
import { NotCompanionError, AccessoryNotAllowedError, TriggerNotAllowedError } from '../errors.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export abstract class VirtualSensor extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  protected static readonly NORMAL_INACTIVE: string = 'NORMAL-INACTIVE';
  protected static readonly TRIGGERED_ACTIVE: string = 'TRIGGERED-ACTIVE';

  private uuidPostfix: string = '-sensor';

  private sensorCharacteristic;

  private isCompanionSensor: boolean = false;

  private trigger: Trigger | undefined;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  protected states = {
    SensorState: this.CLOSED_NORMAL,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    sensorService,
    sensorCharacteristic,
    companionSensorName?: string,
  ) {
    super(platform, accessory);

    this.sensorCharacteristic = sensorCharacteristic;

    if (companionSensorName !== undefined) {
      this.isCompanionSensor = true;
    }

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    if (!this.isCompanionSensor) {
      this.service = this.accessory.getService(sensorService) || this.accessory.addService(sensorService);
    } else {
      this.service = this.accessory.getService(companionSensorName!) ||
                     this.accessory.addService(sensorService, companionSensorName, accessory.UUID + this.uuidPostfix);
    }

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    if (!this.isCompanionSensor) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
    } else {
      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSensorName!);
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${this.getStateName(this.states.SensorState)}`);
    this.service.updateCharacteristic(this.sensorCharacteristic, (this.states.SensorState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.sensorCharacteristic)
      .onGet(this.handleSensorStateGet.bind(this)); // GET - bind to the `handleSensorStateGet` method below

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    // Trigger
    if (this.accessoryConfiguration.sensorTrigger !== undefined) {
      this.trigger = AccessoryFactory.createTrigger(this, this.accessoryConfiguration.sensorTrigger, this.accessoryConfiguration.accessoryName + ' Trigger');
    }
  }

  /**
   * Handle requests to get the current value of the "Sensor State" characteristic
   */
  async handleSensorStateGet() {
    const sensorState = this.states.SensorState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Sensor Current State: ${this.getStateName(sensorState)}`);

    return sensorState;
  }

  /**
   * This method is called by the accessory that has this sensor as a companion
   */
  async triggerCompanionSensorState(sensorState: number, accessory: Accessory) {
    if (!this.isCompanionSensor) {
      throw new NotCompanionError(`${this.accessoryConfiguration.accessoryName} is not a companion sensor`);
    } else if (accessory.accessory.UUID !== this.accessory.UUID) {
      throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    this.states.SensorState = sensorState;

    this.service!.updateCharacteristic(this.sensorCharacteristic, (this.states.SensorState));

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${this.getStateName(this.states.SensorState)}`);
  }

  /**
   * This method is called by the trigger to toggle the sensor
   */
  triggerKeySensorState(sensorState: number, trigger: Trigger, isLoggingDisabled: boolean = false) {
    if (trigger.sensorConfig.accessoryID !== this.accessoryConfiguration.accessoryID) {
      throw new TriggerNotAllowedError(`Trigger ${trigger.name} is not allowed to trigger this sensor`);
    }

    const sensorStateChanged: boolean = (this.states.SensorState !== sensorState) ? true : false;

    this.states.SensorState = sensorState;

    this.service!.updateCharacteristic(this.sensorCharacteristic, (this.states.SensorState));

    if (sensorStateChanged && !isLoggingDisabled) {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${this.getStateName(this.states.SensorState)}`);
    }
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case this.CLOSED_NORMAL: { sensorStateName = VirtualSensor.NORMAL_INACTIVE; break; }
    case this.OPEN_TRIGGERED: { sensorStateName = VirtualSensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
