import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { TriggerableEventAccessory } from './triggerableEventAccessory.js';
import { AccessoryNotAllowedError } from '../errors.js';
import { CompanionSwitch } from './companions/companionSwitch.js';
import { SwitchConfiguration } from '../configuration/accessories/configurationSwitch.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { DurationConfiguration } from '../configuration/configurationDuration.js';
import { Mute, ProgrammableSwitchEvent } from './accessoryCharacteristics.js';

/**
 * Doorbell - Accessory implementation
 */
export class Doorbell extends Accessory<typeof Service.Doorbell> implements TriggerableEventAccessory {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Doorbell';

  private static readonly COMPANION_TIMER_RESET: number = 1;

  private readonly muteStorageKey: string = 'DoorbellMute';

  // Device state
  private Mute: boolean = Mute.UNMUTED;
  private Volume: number = 100;

  private companionSwitch?: CompanionSwitch;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Doorbell,
      Doorbell.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.Volume = this.accessoryConfiguration.doorbell.volume;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedDoorbellMute = accessoryState[this.muteStorageKey] as boolean;

      if (cachedDoorbellMute !== undefined) {
        this.Mute = cachedDoorbellMute;
      }
    }

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
    const pressEvent: number = ProgrammableSwitchEvent.SINGLE_PRESS;

    this.log.debug(`[${this.accessoryName}] Getting Programmable Switch Event: ${ProgrammableSwitchEvent.getName(pressEvent)}`);

    return pressEvent;
  }

  async setMute(value: CharacteristicValue) {
    this.Mute = value as boolean;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Mute: ${Mute.getName(this.Mute)}`);
  }

  async getMute(): Promise<CharacteristicValue> {
    const mute: boolean = this.Mute;

    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Mute.getName(mute)}`);

    return mute;
  }

  async setVolume(value: CharacteristicValue) {
    this.Volume = value as number;

    this.log.info(`[${this.accessoryName}] Setting Volume: ${this.Volume}`);
  }

  async getVolume(): Promise<CharacteristicValue> {
    const volume: number = this.Volume;

    this.log.debug(`[${this.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  /**
   * This method is called by the comoanion switch to ring the doorbell
   */
  async triggerEvent(companionAccessory: Accessory<typeof Service>) {
    if (!(companionAccessory.accessoryId === this.accessoryId)) {
      throw new AccessoryNotAllowedError(`Switch ${companionAccessory.accessoryName} is not allowed to trigger this sensor`);
    }

    this.service!.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, (ProgrammableSwitchEvent.SINGLE_PRESS));

    this.log.info(`[${this.accessoryName}] Triggered Doorbell Event: ${ProgrammableSwitchEvent.getName(ProgrammableSwitchEvent.SINGLE_PRESS)}`);
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.Mute,
    };

    const json = JSON.stringify(jsonState);

    return json;
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
      this.accessoryName + ' Switch',
      this,
    );

    return companionSwitch;
  }
}
