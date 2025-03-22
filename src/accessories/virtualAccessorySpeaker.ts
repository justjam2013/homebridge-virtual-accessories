import { Categories, CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * Lightbulb - Accessory implementation
 */
export class Speaker extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Speaker';

  static readonly INACTIVE: number = 0;
  static readonly ACTIVE: number = 1;

  static readonly MUTED: boolean = true;
  static readonly UNMUTED: boolean = false;

  private readonly stateStorageKey: string = 'SpeakerState';
  private readonly muteStorageKey: string = 'SpeakerMuteState';
  private readonly volumeStorageKey: string = 'SpeakerVolume';

  private states = {
    SpeakerState: Speaker.INACTIVE,
    SpeakerMuteState: Speaker.UNMUTED,
    SpeakerVolume: 100,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    accessory.category = Categories.SPEAKER;

    // First configure the device based on the accessory details
    const mute = (this.accessoryConfiguration.speaker.mute !== undefined) ? this.accessoryConfiguration.speaker.mute : Speaker.UNMUTED;
    const volume = this.accessoryConfiguration.speaker.volume;

    this.states.SpeakerState = Speaker.INACTIVE;
    this.states.SpeakerMuteState = mute;
    this.states.SpeakerVolume = volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.SpeakerState = cachedState;
      }
      if (cachedMute !== undefined) {
        this.states.SpeakerMuteState = cachedMute;
      }
      if (cachedVolume !== undefined) {
        this.states.SpeakerVolume = cachedVolume;
      }
    }

    // set accessory information
    this.service = this.accessory.getService(this.platform.Service.Speaker) || this.accessory.addService(this.platform.Service.Speaker);

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

  /**
   * Handle "SET" requests from HomeKit
   */
  async setActive(value: CharacteristicValue) {
    this.states.SpeakerState = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Speaker.getStateName(this.states.SpeakerState)}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async getActive(): Promise<CharacteristicValue> {
    const speakerState = this.states.SpeakerState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Speaker.getStateName(speakerState)}`);

    return speakerState;
  }

  async setMute(value: CharacteristicValue) {
    this.states.SpeakerVolume = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume: ${this.states.SpeakerVolume}`);
  }

  async getVolume(): Promise<CharacteristicValue> {
    const volume = this.states.SpeakerVolume;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  async setVolume(value: CharacteristicValue) {
    this.states.SpeakerMuteState = value as boolean;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Mute: ${this.states.SpeakerMuteState}`);
  }

  async getMute(): Promise<CharacteristicValue> {
    const mute = this.states.SpeakerMuteState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Mute: ${mute}`);

    return mute;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.SpeakerState,
      [this.muteStorageKey]: this.states.SpeakerMuteState,
      [this.volumeStorageKey]: this.states.SpeakerVolume,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Speaker.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Speaker.INACTIVE: { stateName = 'INACTIVE'; break; }
    case Speaker.ACTIVE: { stateName = 'ACTIVE'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}
