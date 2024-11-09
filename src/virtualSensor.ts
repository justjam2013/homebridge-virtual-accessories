import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';
import { VirtualAccessory } from './virtualAccessory.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export abstract class VirtualSensor extends VirtualAccessory {

  private ON: boolean = true;
  private OFF: boolean = false;

  private sensorCharacteristic;

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

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    if (companionSensorName === undefined) {
      this.service = this.accessory.getService(sensorService) || this.accessory.addService(sensorService);
    } else {
      this.service = this.accessory.getService(companionSensorName) ||
                    this.accessory.addService(sensorService, companionSensorName, accessory.UUID + '-sensor');
    }

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    if (companionSensorName === undefined) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, this.device.accessoryName);
    } else {
      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSensorName);
    }

    // Update the initial state of the accessory
    this.platform.log.debug(`[${this.device.accessoryName}] Setting Sensor Current State: ${this.getStateName(this.states.SensorState)}`);
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

  }

  /**
   * Handle requests to get the current value of the "Sensor State" characteristic
   */
  handleSensorStateGet() {
    const sensorState = this.states.SensorState;

    this.platform.log.debug(`[${this.device.accessoryName}] Getting Sensor Current State: ${this.getStateName(sensorState)}`);

    return sensorState;
  }

  setSensorState(sensorState: number) {
    this.states.SensorState = sensorState;

    this.platform.log.debug(`[${this.device.accessoryName}] Setting Sensor Current State: ${this.getStateName(this.states.SensorState)}`);
    this.service?.updateCharacteristic(this.sensorCharacteristic, (this.states.SensorState));
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case this.CLOSED_NORMAL: { sensorStateName = 'NORMAL-CLOSED'; break; }
    case this.OPEN_TRIGGERED: { sensorStateName = 'TRIGGERED-OPEN'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
