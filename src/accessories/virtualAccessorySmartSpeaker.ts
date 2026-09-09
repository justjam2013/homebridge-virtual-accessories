import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

/**
 * SmartSpeaker - Accessory implementation
 */
export class SmartSpeaker extends ExternalAccessory {

  private readonly stateStorageKey: string = 'SmartSpeakerState';
  private readonly muteStorageKey: string = 'SmartSpeakerMuteState';
  private readonly volumeStorageKey: string = 'SmartSpeakerVolume';
  private readonly configuredNameStorageKey: string = 'SmartSpeakerConfiguredName';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.SmartSpeaker);

    let CurrentMediaState: number = SmartSpeaker.STOP;
    let TargetMediaState: number = SmartSpeaker.STOP;
    let ConfiguredName: string = '';
    let Mute: boolean = SmartSpeaker.UNMUTED;
    let Volume: number = 100;

    // First configure the device based on the accessory details
    ConfiguredName = this.accessoryName;
    Mute = (this.accessoryConfiguration.speaker.mute !== undefined) ? this.accessoryConfiguration.speaker.mute : SmartSpeaker.UNMUTED;
    Volume = this.accessoryConfiguration.speaker.volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;
      const cachedConfiguredName: string = accessoryState[this.configuredNameStorageKey] as string;

      if (cachedState !== undefined) {
        CurrentMediaState = cachedState;
      }
      if (cachedMute !== undefined) {
        Mute = cachedMute;
      }
      if (cachedVolume !== undefined) {
        Volume = cachedVolume;
      }
      if (cachedConfiguredName !== undefined) {
        ConfiguredName = cachedConfiguredName;
      }
    }

    TargetMediaState = CurrentMediaState;

    // Update the initial state of the accessory
    this.setCurrentMediaState(CurrentMediaState);
    this.setTargetMediaState(TargetMediaState);
    this.setConfiguredName(ConfiguredName);
    this.setMute(Mute);
    this.setVolume(Volume);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.CurrentMediaState)
      .onGet(this.getCurrentMediaStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetMediaState)
      .onSet(this.setTargetMediaStateHandler.bind(this))
      .onGet(this.getTargetMediaStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.ConfiguredName)
      .onSet(this.setConfiguredNameHandler.bind(this))
      .onGet(this.getConfiguredNameHandler.bind(this));

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

  // CurrentMediaState

  async getCurrentMediaStateHandler(): Promise<CharacteristicValue> {
    const CurrentMediaState: number = this.getCurrentMediaState();
    this.log.debug(`[${this.accessoryName}] Getting Current Media State: ${SmartSpeaker.getMediaStateName(CurrentMediaState)}`);

    return CurrentMediaState;
  }

  // TargetMediaState

  async getTargetMediaStateHandler(): Promise<CharacteristicValue> {
    const TargetMediaState = this.getTargetMediaState();

    this.log.debug(`[${this.accessoryName}] Getting Target Media State: ${SmartSpeaker.getMediaStateName(TargetMediaState)}`);

    return TargetMediaState;
  }

  async setTargetMediaStateHandler(value: CharacteristicValue) {
    let TargetMediaState: number = value as number;
    TargetMediaState = this.updateTargetMediaState(TargetMediaState);
    this.log.info(`[${this.accessoryName}] Setting Target Media State: ${SmartSpeaker.getMediaStateName(TargetMediaState)}`);

    const CurrentMediaState: number = TargetMediaState;
    this.updateCurrentMediaState(CurrentMediaState);

    this.saveState();

  }

  // ConfiguredName

  async getConfiguredNameHandler(): Promise<CharacteristicValue> {
    const ConfiguredName: string = this.getConfiguredName();
    this.log.debug(`[${this.accessoryName}] Getting Configured Name: ${ConfiguredName}`);

    return ConfiguredName;
  }

  async setConfiguredNameHandler(value: CharacteristicValue) {
    let ConfiguredName: string = value as string;
    ConfiguredName = this.updateConfiguredName(ConfiguredName);
    this.log.info(`[${this.accessoryName}] Setting Configured Name: ${ConfiguredName}`);

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
    this.log.debug(`[${this.accessoryName}] Getting Mute: ${SmartSpeaker.getMuteName(Mute)}`);

    return Mute;
  }

  async setMuteHandler(value: CharacteristicValue) {
    let Mute: boolean = value as boolean;
    Mute = this.updateMute(Mute);
    this.log.info(`[${this.accessoryName}] Setting Mute: ${SmartSpeaker.getMuteName(Mute)}`);
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getCurrentMediaState(),
      [this.configuredNameStorageKey]: this.getConfiguredName(),
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

  static get PLAY(): number         { return CharacteristicType.CurrentMediaState.PLAY; }   // Characteristic.TargetMediaState.PLAY
  static get PAUSE(): number        { return CharacteristicType.CurrentMediaState.PAUSE; }  // Characteristic.TargetMediaState.PAUSE;
  static get STOP(): number         { return CharacteristicType.CurrentMediaState.STOP; }   // Characteristic.TargetMediaState.STOP;
  static get LOADING(): number      { return CharacteristicType.CurrentMediaState.LOADING; }
  static get INTERRUPTED(): number  { return CharacteristicType.CurrentMediaState.INTERRUPTED; }

  static get MUTED(): boolean       { return true; }    // CharacteristicType.Mute
  static get UNMUTED(): boolean     { return false; }   // CharacteristicType.Mute

  static getMuteName(event: boolean): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case SmartSpeaker.MUTED: { name = 'MUTED'; break; }
    case SmartSpeaker.UNMUTED: { name = 'UNMUTED'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }

  static getMediaStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case SmartSpeaker.PLAY: { name = 'PLAY'; break; }
    case SmartSpeaker.PAUSE: { name = 'PAUSE'; break; }
    case SmartSpeaker.STOP: { name = 'STOP'; break; }
    case SmartSpeaker.LOADING: { name = 'LOADING'; break; }
    case SmartSpeaker.INTERRUPTED: { name = 'INTERRUPTED'; break; }
    default: { name = state.toString();}
    }

    return name;
  }
}
