import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
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

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.Doorbell;

  private static readonly COMPANION_TIMER_RESET: number = 1;

  private readonly muteStorageKey: string = 'DoorbellMute';

  private companionSwitch?: CompanionSwitch;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let Mute: boolean = false;
    let Volume: number = 100;
    const ProgrammableSwitchEvent: number = Doorbell.SINGLE_PRESS;

    // First configure the device based on the accessory details
    Volume = this.accessoryConfiguration.doorbell.volume;

    // Accessory is stateful, retrieve stored state
    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedMute = accessoryState[this.muteStorageKey] as boolean;

      if (cachedMute !== undefined) {
        Mute = cachedMute;
      }
    }

    // Update the initial state of the accessory
    this.setProgrammableSwitchEvent(ProgrammableSwitchEvent);
    this.setMute(Mute);
    this.setVolume(Volume);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.ProgrammableSwitchEvent)
      .onGet(this.getProgrammableSwitchEventHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Mute)
      .onSet(this.setMuteHandler.bind(this))
      .onGet(this.getMuteHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Volume)
      .onSet(this.setVolumeHandler.bind(this))
      .onGet(this.getVolumeHandler.bind(this));

    // Create switch service
    this.companionSwitch = this.createCompanionSwitch();
  }

  //
  // ****************************** Handlers ******************************
  //

  // ProgrammableSwitchEvent

  async getProgrammableSwitchEventHandler(): Promise<CharacteristicValue> {
    const ProgrammableSwitchEvent: number = this.getProgrammableSwitchEvent();
    this.log.debug(`[${this.accessoryName}] Getting Programmable Switch Event: ${Doorbell.getEventName(ProgrammableSwitchEvent)}`);

    return ProgrammableSwitchEvent;
  }

  // Mute

  async getMuteHandler(): Promise<CharacteristicValue> {
    const Mute: boolean = this.getMute();
    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Mute}`);

    return Mute;
  }

  async setMuteHandler(value: CharacteristicValue) {
    let Mute: boolean = value as boolean;
    Mute = this.updateMute(Mute);
    this.log.info(`[${this.accessoryName}] Setting Mute: ${Mute}`);

    this.saveState();
  }

  // Volume

  async getVolumeHandler(): Promise<CharacteristicValue> {
    const Volume: number = this.getVolume();
    this.log.debug(`[${this.accessoryName}] Getting Volume: ${Volume}`);

    return Volume;
  }

  async setVolumeHandler(value: CharacteristicValue) {
    let Volume = value as number;
    Volume = this.updateVolume(Volume);
    this.log.info(`[${this.accessoryName}] Setting Volume: ${Volume}`);
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.getMute(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return Doorbell.ACCESSORY_SERVICE_TYPE;
  }

  //
  // ****************************** Companion Switch ******************************
  //

  // This method is called by the comoanion switch to ring the doorbell
  async triggerEvent(companionAccessory: Accessory) {
    if (!(companionAccessory.accessoryConfiguration.accessoryID === this.accessoryConfiguration.accessoryID)) {
      throw new AccessoryNotAllowedError(`Switch ${companionAccessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    const ProgrammableSwitchEvent: number = this.updateProgrammableSwitchEvent(Doorbell.SINGLE_PRESS);

    this.log.info(`[${this.accessoryName}] Triggered Doorbell Event: ${Doorbell.getEventName(ProgrammableSwitchEvent)}`);
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

  //
  // ****************************** Characteristics ******************************
  //

  static readonly SINGLE_PRESS: number =      CharacteristicType.ProgrammableSwitchEvent.SINGLE_PRESS;
  static readonly DOUBLE_PRESS: number =      CharacteristicType.ProgrammableSwitchEvent.DOUBLE_PRESS;
  static readonly LONG_PRESS: number =        CharacteristicType.ProgrammableSwitchEvent.LONG_PRESS;

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
