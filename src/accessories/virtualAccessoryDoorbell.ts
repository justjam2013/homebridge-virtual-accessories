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

class DoorbellStatus {
  Volume: number = 0;
  Mute: boolean = false;
  ProgrammableSwitchEvent: number = Doorbell.SINGLE_PRESS;
}

/**
 * Doorbell - Accessory implementation
 */
export class Doorbell extends Accessory implements TriggerableEventAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Doorbell';

  static readonly SINGLE_PRESS: number =  CharacteristicType.ProgrammableSwitchEvent.SINGLE_PRESS;
  static readonly DOUBLE_PRESS: number =  CharacteristicType.ProgrammableSwitchEvent.DOUBLE_PRESS;
  static readonly LONG_PRESS: number =    CharacteristicType.ProgrammableSwitchEvent.LONG_PRESS;

  private static readonly COMPANION_TIMER_RESET: number = 1;

  private readonly muteStorageKey: string = 'DoorbellMute';
  private readonly volumeStorageKey: string = 'DoorbellVolume';

  private companionSwitch?: CompanionSwitch;

  private status: DoorbellStatus = new DoorbellStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.status.Volume = this.accessoryConfiguration.doorbell.volume;
    this.status.Mute = this.accessoryConfiguration.doorbell.mute;

    // If the accessory is stateful retrieve stored state
    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedDoorbellMute = accessoryState[this.muteStorageKey] as boolean;
      const cachedDoorbellVolume = accessoryState[this.volumeStorageKey] as number;

      if (cachedDoorbellMute !== undefined) {
        this.status.Mute = cachedDoorbellMute;
      }

      if (cachedDoorbellVolume !== undefined) {
        this.status.Volume = cachedDoorbellVolume;
      }
    }

    // register handlers

    this.service.getCharacteristic(CharacteristicType.ProgrammableSwitchEvent)
      .onGet(this.getProgrammableSwitchEventHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Mute)
      .onGet(this.getMuteHandler.bind(this))
      .onSet(this.setMuteHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Volume)
      .onGet(this.getVolumeHandler.bind(this))
      .onSet(this.setVolumeHandler.bind(this));

    // Create switch service
    this.companionSwitch = this.createCompanionSwitch();
  }

  // *** Handlers ***

  // ProgrammableSwitchEvent

  async getProgrammableSwitchEventHandler(): Promise<CharacteristicValue> {
    const ProgrammableSwitchEventHandler: number = this.status.ProgrammableSwitchEvent;
    this.log.debug(`[${this.accessoryName}] Getting Programmable Switch Event: ${Doorbell.getEventName(ProgrammableSwitchEventHandler)}`);

    return ProgrammableSwitchEventHandler;
  }

  // Mute

  async getMuteHandler(): Promise<CharacteristicValue> {
    const Mute: boolean = this.status.Mute;
    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Mute}`);

    return Mute;
  }

  async setMuteHandler(value: CharacteristicValue) {
    const Mute: boolean = value as boolean;
    this.status.Mute = Mute;
    this.log.info(`[${this.accessoryName}] Setting Mute: ${Mute}`);

    this.storeState();
  }

  // Volume

  async getVolumeHandler(): Promise<CharacteristicValue> {
    const Volume: number = this.status.Volume;
    this.log.debug(`[${this.accessoryName}] Getting Volume: ${Volume}`);

    return Volume;
  }

  async setVolumeHandler(value: CharacteristicValue) {
    const Volume: number = value as number;
    this.status.Volume = Volume;
    this.log.info(`[${this.accessoryName}] Setting Volume: ${Volume}`);

    this.storeState();
  }

  /**
   * This method is called by the companion switch to ring the doorbell
   */
  async triggerEvent(companionAccessory: Accessory) {
    if (!(companionAccessory.accessoryConfiguration.accessoryID === this.accessoryConfiguration.accessoryID)) {
      throw new AccessoryNotAllowedError(`Switch ${companionAccessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    this.status.ProgrammableSwitchEvent = Doorbell.SINGLE_PRESS;

    this.log.info(`[${this.accessoryName}] Triggered Doorbell Event: ${Doorbell.getEventName(Doorbell.SINGLE_PRESS)}`);
  }

  // Absract method implementations

  protected getAccessoryTypeName(): string {
    return Doorbell.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.Doorbell;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.status.Mute,
      [this.volumeStorageKey]: this.status.Volume,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  // Static

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
