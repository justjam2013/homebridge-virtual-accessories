import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

import { AccessoryNotAllowedError } from '../errors.js';
import { CompanionSwitch } from '../companions/companionSwitch.js';
import { SwitchConfiguration } from '../configuration/accessories/configurationSwitch.js';

/**
 * Doorbell - Accessory implementation
 */
export class Doorbell extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Doorbell';

  static readonly SINGLE_PRESS: number = 0;  // Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
  static readonly DOUBLE_PRESS: number = 1;  // Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
  static readonly LONG_PRESS: number = 2;    // Characteristic.ProgrammableSwitchEvent.LONG_PRESS;

  private static readonly COMPANION_TIMEOUT_SECS: number = 1000;

  private companionSensorResetTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    Volume: 100,
  };

  private companionSwitch?: CompanionSwitch;

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
      .onGet(this.getProgrammableSwitchEvent.bind(this));

    // TODO: Figure out how to change the volume
    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));

    // Create switch service
    this.companionSwitch = this.createCompanionSwitch();

    // Overwrite the "onSet" handler to trigger doorbell
    this.companionSwitch!.service!.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setCompanionSwitchOn.bind(this));
  }

  // Handlers

  async getProgrammableSwitchEvent(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const pressEvent = Doorbell.SINGLE_PRESS;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Programmable Switch Event: ${Doorbell.getEventName(pressEvent)}`);

    return pressEvent;
  }

  async setVolume(value: CharacteristicValue) {
    this.states.Volume = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume: ${this.states.Volume}`);
  }

  async getVolume(): Promise<CharacteristicValue> {
    const volume = this.states.Volume;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  async setCompanionSwitchOn(value: CharacteristicValue) {
    const newState = value as boolean;
    this.companionSwitch!.setState(newState, this);

    if (newState === CompanionSwitch.ON) {
      // this.service!.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent).updateValue(this.state);
      this.triggerDoorbellEvent(Doorbell.SINGLE_PRESS, this.companionSwitch!);

      if (this.companionSensorResetTimerId) {
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Clearing reset timer: ${this.companionSensorResetTimerId}`);
        clearTimeout(this.companionSensorResetTimerId);
      }

      // Reset switch after timer delay
      this.companionSensorResetTimerId = setTimeout(() => {
        this.companionSwitch!.service!.setCharacteristic(this.platform.Characteristic.On, CompanionSwitch.OFF);
      }, Doorbell.COMPANION_TIMEOUT_SECS);
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Set new reset timer: ${this.companionSensorResetTimerId}`);
    }

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Companion Switch Current State: ${CompanionSwitch.getStateName(newState)}`);
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

  private createCompanionSwitch(): CompanionSwitch {

    // Enrich configuration with "switch" settings
    this.accessoryConfiguration.switch = new SwitchConfiguration();
    this.accessoryConfiguration.switch.defaultState = 'off';
    this.accessoryConfiguration.switch.hasCompanionSensor = false;
    this.accessoryConfiguration.switch.hasResetTimer = false;
    this.accessoryConfiguration.switch.muteLogging = false;

    return new CompanionSwitch(this.platform, this.accessory, this.accessoryConfiguration.accessoryName + ' Switch');
  }
}
