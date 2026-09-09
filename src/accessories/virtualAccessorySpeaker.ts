import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

/**
 * Speaker - Accessory implementation
 */
export class Speaker extends ExternalAccessory {

  private readonly stateStorageKey: string = 'SpeakerState';
  private readonly muteStorageKey: string = 'SpeakerMuteState';
  private readonly volumeStorageKey: string = 'SpeakerVolume';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Speaker);

    let Active: number = Speaker.INACTIVE;
    let Mute: boolean = Speaker.UNMUTED;
    let Volume: number = 100;

    // First configure the device based on the accessory details
    Mute = (this.accessoryConfiguration.speaker.mute !== undefined) ? this.accessoryConfiguration.speaker.mute : Speaker.UNMUTED;
    Volume = this.accessoryConfiguration.speaker.volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;

      if (cachedState !== undefined) {
        Active = cachedState;
      }
      if (cachedMute !== undefined) {
        Mute = cachedMute;
      }
      if (cachedVolume !== undefined) {
        Volume = cachedVolume;
      }
    }

    // Update the initial state of the accessory
    this.setActive(Active);
    this.setMute(Mute);
    this.setVolume(Volume);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.Active)
      .onSet(this.setActiveHandler.bind(this))
      .onGet(this.getActiveHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Mute)
      .onSet(this.setMuteHandler.bind(this))
      .onGet(this.getMuteHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Volume)
      .onSet(this.setVolumeHandler.bind(this))
      .onGet(this.getVolumeHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // Active

  async getActiveHandler(): Promise<CharacteristicValue> {
    const Active: number = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting State: ${Speaker.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHandler(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting State: ${Speaker.getActiveName(Active)}`);

    this.saveState();
  }

  // Volume

  async getVolumeHandler(): Promise<CharacteristicValue> {
    const Volume: number = this.getVolume();
    this.log.debug(`[${this.accessoryName}] Getting Volume: ${Volume}%`);

    return Volume;
  }

  async setVolumeHandler(value: CharacteristicValue) {
    let Volume: number = value as number;
    Volume = this.updateVolume(Volume);
    this.log.info(`[${this.accessoryName}] Setting Volume: ${Volume}%`);
  }

  // Mute

  async getMuteHandler(): Promise<CharacteristicValue> {
    const Mute: boolean = this.getMute();
    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Speaker.getMuteName(Mute)}`);

    return Mute;
  }

  async setMuteHandler(value: CharacteristicValue) {
    let Mute: boolean = value as boolean;
    Mute = this.updateMute(Mute);
    this.log.info(`[${this.accessoryName}] Setting Mute: ${Speaker.getMuteName(Mute)}`);
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getActive(),
      [this.muteStorageKey]: this.getMute(),
      [this.volumeStorageKey]: this.getVolume(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get INACTIVE(): number { return CharacteristicType.Active.INACTIVE; }
  static get ACTIVE(): number   { return CharacteristicType.Active.ACTIVE; }

  static get MUTED(): boolean   { return true; }  // CharacteristicType.Mute
  static get UNMUTED(): boolean { return false; } // CharacteristicType.Mute

  static getActiveName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Speaker.INACTIVE: { name = 'INACTIVE'; break; }
    case Speaker.ACTIVE: { name = 'ACTIVE'; break; }
    default: { name = state.toString();}
    }

    return name;
  }

  static getMuteName(event: boolean): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case Speaker.MUTED: { name = 'MUTED'; break; }
    case Speaker.UNMUTED: { name = 'UNMUTED'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }
}
