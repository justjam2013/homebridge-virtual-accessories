import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { AccessoryFactory } from '../accessoryFactory.js';
import { Switch } from './virtualAccessorySwitch.js';
import { AccessoryNotAllowedError } from '../errors.js';

/**
 * Doorbell - Accessory implementation
 */
export class Doorbell extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Doorbell';

  static readonly SINGLE_PRESS: number = 0;  // Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
  static readonly DOUBLE_PRESS: number = 1;  // Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
  static readonly LONG_PRESS: number = 2;    // Characteristic.ProgrammableSwitchEvent.LONG_PRESS;

  private companionSensorResetTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    Volume: 100,
  };

  protected companionSwitch?: Switch;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.states.Volume = this.accessoryConfiguration.doorbell.volume;

    this.service = this.accessory.getService(this.platform.Service.Doorbell) || this.accessory.addService(this.platform.Service.Doorbell);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

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

    // Create switch service
    this.companionSwitch = AccessoryFactory.createVirtualCompanionSwitch(
      this.platform, this.accessory, this.accessoryConfiguration.accessoryName + ' Switch');

    // Overwrite the "onSet" handler to trigger doorbell
    this.companionSwitch!.service!.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.companionSwitchSetOn.bind(this));  // SET - bind to the `setOn` method below
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleProgrammableSwitchEventGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const pressEvent = Doorbell.SINGLE_PRESS;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Programmable Switch Event: ${Doorbell.getEventName(pressEvent)}`);

    return pressEvent;
  }
  /**
   * Handle "SET" requests from HomeKit
   */
  async handleVolumeSet(value: CharacteristicValue) {
    this.states.Volume = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume: ${this.states.Volume}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async handleVolumeGet(): Promise<CharacteristicValue> {
    const volume = this.states.Volume;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async companionSwitchSetOn(value: CharacteristicValue) {
    const newState = value as boolean;
    this.companionSwitch!.setCompanionSwitchState(newState, this);

    if (newState === Switch.ON) {
      // this.service!.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent).updateValue(this.state);
      this.triggerDoorbellEvent(Doorbell.SINGLE_PRESS, this.companionSwitch!);

      if (this.companionSensorResetTimerId) {
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Clearing reset timer: ${this.companionSensorResetTimerId}`);
        clearTimeout(this.companionSensorResetTimerId);
      }

      // Reset switch after timer delay
      this.companionSensorResetTimerId = setTimeout(() => {
        this.companionSwitch!.service!.setCharacteristic(this.platform.Characteristic.On, Switch.OFF);
      }, 1000);
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Set new reset timer: ${this.companionSensorResetTimerId}`);
    }

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Companion Switch Current State: ${Switch.getStateName(newState)}`);
  }

  /**
   * This method is called by the switch to ring the doorbell
   */
  private async triggerDoorbellEvent(event: number, accessory: Accessory) {
    if (!(accessory.accessoryConfiguration.accessoryID === this.accessoryConfiguration.accessoryID)) {
      throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    this.service!.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, (event));

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Triggered Doorbell Event: ${Doorbell.getEventName(event)}`);
  }

  protected getJsonState(): string {
    return JSON.stringify({});
  }

  protected getAccessoryTypeName(): string {
    return Doorbell.ACCESSORY_TYPE_NAME;
  }

  static getEventName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case Doorbell.SINGLE_PRESS: { eventName = 'SINGLE PRESS'; break; }
    case Doorbell.DOUBLE_PRESS: { eventName = 'DOUBLE PRESS'; break; }
    case Doorbell.LONG_PRESS: { eventName = 'LONG PRESS'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}
