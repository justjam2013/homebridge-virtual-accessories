import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * Doorbell - Accessory implementation
 */
export class Doorbell extends Accessory {

  private SINGLE_PRESS: number = this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;  // 0
  private DOUBLE_PRESS: number = this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;  // 1
  private LONG_PRESS: number = this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;      // 2

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    Volume: 100,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.states.Volume = this.accessoryConfiguration.doorbellVolume;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Doorbell')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Doorbell) || this.accessory.addService(this.platform.Service.Doorbell);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the ProgrammableSwitchEvent Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
      .onGet(this.handleProgrammableSwitchEventGet.bind(this)); // GET - bind to the 'handleProgrammableSwitchEventGet` method below

    // TODO: Figure out how to change the volume
    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.handleVolumeSet.bind(this)) // SET - bind to the 'handleVolumeSet` method below
      .onGet(this.handleVolumeGet.bind(this)); // GET - bind to the 'handleVolumeGet` method below

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
   * Handle "GET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async handleProgrammableSwitchEventGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const pressEvent = this.SINGLE_PRESS;

    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Programmable Switch Event: ${this.getEventName(pressEvent)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return pressEvent;
  }
  /**
   * Handle "SET" requests from HomeKit
   */
  async handleVolumeSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.Volume = value as number;

    this.platform.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume to ${this.states.Volume}`);
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
  async handleVolumeGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const volume = this.states.Volume;

    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${volume}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return volume;
  }

  private getEventName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case this.SINGLE_PRESS: { eventName = 'SINGLE_PRESS'; break; }
    case this.DOUBLE_PRESS: { eventName = 'DOUBLE_PRESS'; break; }
    case this.LONG_PRESS: { eventName = 'LONG_PRESS'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}
