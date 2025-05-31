import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { ExternalAccessory } from './externalAccessory.js';
import { AudioAccessoryConfiguration } from '../configuration/configurationAudioAccessoryConfiguration.js';

/**
 * Lightbulb - Accessory implementation
 */
export abstract class AudioAccessory extends ExternalAccessory {

  static readonly INACTIVE: number = 0;       //	Characteristic.Active.INACTIVE;
  static readonly ACTIVE: number = 1;         //	Characteristic.Active.ACTIVE;

  static readonly MUTED: boolean = true;      //	Characteristic.Mute;
  static readonly UNMUTED: boolean = false;   //	Characteristic.Mute;

  private readonly stateStorageKey: string = 'SpeakerState';
  private readonly muteStorageKey: string = 'SpeakerMuteState';
  private readonly volumeStorageKey: string = 'SpeakerVolume';

  private audioAccessoryConfiguration: AudioAccessoryConfiguration;

  private states = {
    Active: AudioAccessory.INACTIVE,
    Mute: AudioAccessory.UNMUTED,
    Volume: 100,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.audioAccessoryConfiguration = this.getAudioAccessoryConfiguration();
    const mute = (this.audioAccessoryConfiguration.mute !== undefined) ? this.audioAccessoryConfiguration.mute : AudioAccessory.UNMUTED;
    const volume = this.audioAccessoryConfiguration.volume;

    this.states.Active = AudioAccessory.INACTIVE;
    this.states.Mute = mute;
    this.states.Volume = volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.Active = cachedState;
      }
      if (cachedMute !== undefined) {
        this.states.Mute = cachedMute;
      }
      if (cachedVolume !== undefined) {
        this.states.Volume = cachedVolume;
      }
    }

    // set accessory information
    const service: WithUUID<typeof Service> = this.getAudioAccessoryService();
    this.service = this.accessory.getService(service) || this.accessory.addService(service as unknown as Service);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

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
    this.states.Active = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${AudioAccessory.getStateName(this.states.Active)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const speakerState = this.states.Active;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${AudioAccessory.getStateName(speakerState)}`);

    return speakerState;
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

  async setMute(value: CharacteristicValue) {
    this.states.Mute = value as boolean;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Mute: ${this.states.Mute}`);
  }

  async getMute(): Promise<CharacteristicValue> {
    const mute = this.states.Mute;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Mute: ${mute}`);

    return mute;
  }

  protected abstract getAudioAccessoryConfiguration(): AudioAccessoryConfiguration;

  protected abstract getAudioAccessoryService(): WithUUID<typeof Service>;

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.Active,
      [this.muteStorageKey]: this.states.Mute,
      [this.volumeStorageKey]: this.states.Volume,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  static getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case AudioAccessory.INACTIVE: { stateName = 'INACTIVE'; break; }
    case AudioAccessory.ACTIVE: { stateName = 'ACTIVE'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}
