import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { percentage } from '../customTypes.js';

/**
 * Fan - Accessory implementation
 */
export class Fan extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly CLOCKWISE: number = 0;          // Characteristic.ProgrammableSwitchEvent.RotationDirection.CLOCKWISE;
  static readonly COUNTER_CLOCKWISE: number = 1;  // Characteristic.ProgrammableSwitchEvent.RotationDirection.COUNTER_CLOCKWISE;

  private states = {
    FanState: Fan.OFF,
    FanRotationDirection: Fan.CLOCKWISE,
    FanRotationSpeed: 100,
  };

  private readonly stateStorageKey: string = 'FanState';
  private readonly rotatioDirectionStorageKey: string = 'FanRotationDirection';
  private readonly rotatioSpeedStorageKey: string = 'FanRotationSpeed';

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);


    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.fan.defaultState === 'on' ? Fan.ON : Fan.OFF;
    const rotationDirection: number = this.accessoryConfiguration.fan.rotationDirection === 'clockwise' ? Fan.CLOCKWISE : Fan.COUNTER_CLOCKWISE;
    const rotationSpeed: percentage = this.accessoryConfiguration.fan.rotationSpeed as percentage;

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState = accessoryState[this.stateStorageKey];
      const cachedRotationDirection = accessoryState[this.rotatioDirectionStorageKey];
      const cachedRotationSpeed = accessoryState[this.rotatioSpeedStorageKey];

      if (cachedState !== undefined && cachedRotationDirection !== undefined && cachedRotationSpeed !== undefined) {
        this.states.FanState = cachedState;
        this.states.FanRotationDirection = cachedRotationDirection;
        this.states.FanRotationSpeed = cachedRotationSpeed;
      } else {
        this.states.FanState = this.defaultState;
        this.states.FanRotationDirection = rotationDirection;
        this.states.FanRotationSpeed = rotationSpeed;
      }
    } else {
      this.states.FanState = this.defaultState;
      this.states.FanRotationDirection = rotationDirection;
      this.states.FanRotationSpeed = rotationSpeed;
    }

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Fan')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Fan) || this.accessory.addService(this.platform.Service.Fan);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory     
    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Fan Current State: ${Fan.getStateName(this.states.FanState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.FanState));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationDirection, (this.states.FanRotationDirection));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, (this.states.FanRotationSpeed));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the RotationDirection Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.RotationDirection)
      .onSet(this.setRotationDirection.bind(this))
      .onGet(this.getRotationDirection.bind(this));

    // register handlers for the RotationDirection Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this))
      .onGet(this.getRotationSpeed.bind(this));

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
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.FanState = value as boolean;

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.platform.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Fan.getStateName(this.states.FanState)}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const fanState = this.states.FanState;

    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Fan.getStateName(fanState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return fanState;
  }

  async setRotationDirection(value: CharacteristicValue) {
    this.states.FanRotationDirection = value as number;

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.platform.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Direction: ${this.states.FanRotationDirection}`);
  }

  async getRotationDirection(): Promise<CharacteristicValue> {
    const fanRotationDirection = this.states.FanRotationDirection;

    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Direction: ${fanRotationDirection}`);

    return fanRotationDirection;
  }

  async setRotationSpeed(value: CharacteristicValue) {
    this.states.FanRotationSpeed = value as number;

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.platform.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Speed: ${this.states.FanRotationSpeed}%`);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const fanRotationSpeed = this.states.FanRotationSpeed;

    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Speed: ${fanRotationSpeed}%`);

    return fanRotationSpeed;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.FanState,
      [this.rotatioDirectionStorageKey]: this.states.FanRotationDirection,
      [this.rotatioSpeedStorageKey]: this.states.FanRotationSpeed,
    });
    return json;
  }

  static getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Fan.ON: { stateName = 'ON'; break; }
    case Fan.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}
