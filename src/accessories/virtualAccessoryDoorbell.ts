import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { TriggerableEventAccessory } from './triggerableEventAccessory.js';
import { AccessoryNotAllowedError } from '../errors.js';
import { CompanionSwitch } from './companions/companionSwitch.js';
import { SwitchConfiguration } from '../configuration/accessories/configurationSwitch.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { DurationConfiguration } from '../configuration/configurationDuration.js';

/**
 * Doorbell - Accessory implementation
 */
export class Doorbell extends Accessory implements TriggerableEventAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Doorbell';

  static readonly SINGLE_PRESS: number = 0;  // Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
  static readonly DOUBLE_PRESS: number = 1;  // Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
  static readonly LONG_PRESS: number = 2;    // Characteristic.ProgrammableSwitchEvent.LONG_PRESS

  private static readonly COMPANION_TIMER_RESET: number = 1;

  private readonly muteStorageKey: string = 'DoorbellMute';

  private states = {
    Mute: false,
    Volume: 100,
  };

  private companionSwitch?: CompanionSwitch;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.Volume = this.accessoryConfiguration.doorbell.volume;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedDoorbellMute = accessoryState[this.muteStorageKey] as boolean;

      if (cachedDoorbellMute !== undefined) {
        this.states.Mute = cachedDoorbellMute;
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Doorbell) || this.accessory.addService(this.platform.Service.Doorbell);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    this.service.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
      .onGet(this.getProgrammableSwitchEvent.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      .onSet(this.setMute.bind(this))
      .onGet(this.getMute.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));

    // Create switch service
    this.companionSwitch = this.createCompanionSwitch();
  }

  // Handlers

  async getProgrammableSwitchEvent(): Promise<CharacteristicValue> {
    const pressEvent: number = Doorbell.SINGLE_PRESS;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Programmable Switch Event: ${Doorbell.getEventName(pressEvent)}`);

    return pressEvent;
  }

  async setMute(value: CharacteristicValue) {
    this.states.Mute = value as boolean;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Mute: ${this.states.Mute}`);
  }

  async getMute(): Promise<CharacteristicValue> {
    const mute: boolean = this.states.Mute;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Mute: ${mute}`);

    return mute;
  }

  async setVolume(value: CharacteristicValue) {
    this.states.Volume = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume: ${this.states.Volume}`);
  }

  async getVolume(): Promise<CharacteristicValue> {
    const volume: number = this.states.Volume;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  /**
   * This method is called by the comoanion switch to ring the doorbell
   */
  async triggerEvent(companionAccessory: Accessory) {
    if (!(companionAccessory.accessoryConfiguration.accessoryID === this.accessoryConfiguration.accessoryID)) {
      throw new AccessoryNotAllowedError(`Switch ${companionAccessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    this.service!.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, (Doorbell.SINGLE_PRESS));

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Triggered Doorbell Event: ${Doorbell.getEventName(Doorbell.SINGLE_PRESS)}`);
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.states.Mute,
    };

    const json = JSON.stringify(jsonState);

    return json;
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
    this.accessoryConfiguration.switch.hasResetTimer = true;
    this.accessoryConfiguration.switch.muteLogging = false;

    // Enrich configuration with "resetTimer" settings
    this.accessoryConfiguration.resetTimer = new TimerConfiguration();
    this.accessoryConfiguration.resetTimer.duration = new DurationConfiguration();
    this.accessoryConfiguration.resetTimer.duration.days = 0;
    this.accessoryConfiguration.resetTimer.duration.hours = 0;
    this.accessoryConfiguration.resetTimer.duration.minutes = 0;
    this.accessoryConfiguration.resetTimer.duration.seconds = Doorbell.COMPANION_TIMER_RESET;

    const companionSwitch = new CompanionSwitch(
      this.platform,
      this.accessory,
      this.accessoryConfiguration,
      this.accessoryConfiguration.accessoryName + ' Switch',
      this,
    );

    return companionSwitch;
  }
}
