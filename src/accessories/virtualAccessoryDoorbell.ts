import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

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

  static readonly ACCESSORY_TYPE_NAME: string = 'Doorbell';

  static SINGLE_PRESS: number;  // Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
  static DOUBLE_PRESS: number;  // Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
  static LONG_PRESS: number;    // Characteristic.ProgrammableSwitchEvent.LONG_PRESS

  private static readonly COMPANION_TIMER_RESET: number = 1;

  private readonly muteStorageKey: string = 'DoorbellMute';
  private readonly volumeStorageKey: string = 'DoorbellVolume';

  private companionSwitch?: CompanionSwitch;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.setupStaticFields();

    // First configure the device based on the accessory details
    let Volume: number = this.accessoryConfiguration.doorbell.volume;
    let Mute: boolean = this.accessoryConfiguration.doorbell.mute;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedDoorbellMute = accessoryState[this.muteStorageKey] as boolean;
      const cachedDoorbellVolume = accessoryState[this.volumeStorageKey] as number;

      if (cachedDoorbellMute !== undefined) {
        Mute = cachedDoorbellMute;
      }

      if (cachedDoorbellVolume !== undefined) {
        Volume = cachedDoorbellVolume;
      }
    }

    this.service = this.accessory.getService(ServiceType.Doorbell) || this.accessory.addService(ServiceType.Doorbell);

    this.service.setCharacteristic(CharacteristicType.Name, this.accessoryName);

    this.updateMute(Mute);
    this.updateVolume(Volume);

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
    const ProgrammableSwitchEventHandler: number = this.getProgrammableSwitchEvent();
    this.log.debug(`[${this.accessoryName}] Getting Programmable Switch Event: ${Doorbell.getEventName(ProgrammableSwitchEventHandler)}`);

    return ProgrammableSwitchEventHandler;
  }

  // Mute

  async getMuteHandler(): Promise<CharacteristicValue> {
    const Mute: boolean = this.getMute();
    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Mute}`);

    return Mute;
  }

  async setMuteHandler(value: CharacteristicValue) {
    const Mute: boolean = value as boolean;
    this.updateMute(Mute);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Mute: ${Mute}`);

    this.storeState();
  }

  // Volume

  async getVolumeHandler(): Promise<CharacteristicValue> {
    const Volume: number = this.getVolume();
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${Volume}`);

    return Volume;
  }

  async setVolumeHandler(value: CharacteristicValue) {
    const Volume: number = value as number;
    this.updateVolume(Volume);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume: ${Volume}`);

    this.storeState();
  }

  // *** Handlers ***

  /**
   * This method is called by the comoanion switch to ring the doorbell
   */
  async triggerEvent(companionAccessory: Accessory) {
    if (!(companionAccessory.accessoryConfiguration.accessoryID === this.accessoryConfiguration.accessoryID)) {
      throw new AccessoryNotAllowedError(`Switch ${companionAccessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    this.updateProgrammableSwitchEvent(Doorbell.SINGLE_PRESS);

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Triggered Doorbell Event: ${Doorbell.getEventName(Doorbell.SINGLE_PRESS)}`);
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.getMute(),
      [this.volumeStorageKey]: this.getVolume(),
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

  // Convenience methods

  private setupStaticFields() {
    Doorbell.SINGLE_PRESS = CharacteristicType.ProgrammableSwitchEvent.SINGLE_PRESS;
    Doorbell.DOUBLE_PRESS = CharacteristicType.ProgrammableSwitchEvent.DOUBLE_PRESS;
    Doorbell.LONG_PRESS   = CharacteristicType.ProgrammableSwitchEvent.LONG_PRESS;
  }

  // ProgrammableSwitchEvent

  private getProgrammableSwitchEvent(): number {
    return Doorbell.SINGLE_PRESS;
  }

  private updateProgrammableSwitchEvent(
    value: number,
  ) {
    this.updateValue(CharacteristicType.ProgrammableSwitchEvent, value);
  }

  // Mute

  private getMute(): boolean {
    return this.getValue(CharacteristicType.Mute) as boolean;
  }

  private updateMute(
    value: boolean,
  ) {
    this.updateValue(CharacteristicType.Mute, value);
  }

  // Volume

  private getVolume(): number {
    return this.getValue(CharacteristicType.Volume) as number;
  }

  private updateVolume(
    value: number,
  ) {
    this.updateValue(CharacteristicType.Volume, value);
  }
}
