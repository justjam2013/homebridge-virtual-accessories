import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

import { AudioAccessoryConfiguration } from '../configuration/configurationAudioAccessoryConfiguration.js';
import { Active, Mute } from './accessoryCharacteristics.js';

/**
 * Speaker - Accessory implementation
 */
export class Speaker extends ExternalAccessory<typeof Service.Speaker> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Speaker';

  private readonly stateStorageKey: string = 'SpeakerState';
  private readonly muteStorageKey: string = 'SpeakerMuteState';
  private readonly volumeStorageKey: string = 'SpeakerVolume';

  private audioAccessoryConfiguration: AudioAccessoryConfiguration;

  // Device states
  private Active: number = Active.INACTIVE;
  private Mute: boolean = Mute.UNMUTED;
  private Volume: number = 100;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Speaker,
      Speaker.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.audioAccessoryConfiguration = this.accessoryConfiguration.speaker;
    const mute: boolean = (this.audioAccessoryConfiguration.mute !== undefined) ? this.audioAccessoryConfiguration.mute : Mute.UNMUTED;
    const volume: number = this.audioAccessoryConfiguration.volume;

    this.Active = Active.INACTIVE;
    this.Mute = mute;
    this.Volume = volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;

      if (cachedState !== undefined) {
        this.Active = cachedState;
      }
      if (cachedMute !== undefined) {
        this.Mute = cachedMute;
      }
      if (cachedVolume !== undefined) {
        this.Volume = cachedVolume;
      }
    }

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      .onSet(this.setMute.bind(this))
      .onGet(this.getMute.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.Active = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting State: ${Active.getName(this.Active)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const speakerState = this.Active;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Active.getName(speakerState)}`);

    return speakerState;
  }

  async setVolume(value: CharacteristicValue) {
    this.Volume = value as number;

    this.log.info(`[${this.accessoryName}] Setting Volume: ${this.Volume}`);
  }

  async getVolume(): Promise<CharacteristicValue> {
    const volume = this.Volume;

    this.log.debug(`[${this.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  async setMute(value: CharacteristicValue) {
    this.Mute = value as boolean;

    this.log.info(`[${this.accessoryName}] Setting Mute: ${Mute.getName(this.Mute)}`);
  }

  async getMute(): Promise<CharacteristicValue> {
    const mute = this.Mute;

    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Mute.getName(mute)}`);

    return mute;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.Active,
      [this.muteStorageKey]: this.Mute,
      [this.volumeStorageKey]: this.Volume,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }
}
