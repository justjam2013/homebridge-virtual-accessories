import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

/**
 * SmartSpeaker - Accessory implementation
 */
export class SmartSpeaker extends ExternalAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'SmartSpeaker';

  static readonly PLAY: number = 0;           //	Characteristic.CurrentMediaState.PLAY - Characteristic.TargetMediaState.PLAY
  static readonly PAUSE: number = 1;          //	Characteristic.CurrentMediaState.PAUSE - Characteristic.TargetMediaState.PAUSE
  static readonly STOP: number = 2;           //	Characteristic.CurrentMediaState.STOP - Characteristic.TargetMediaState.STOP
  static readonly LOADING: number = 3;        //	Characteristic.CurrentMediaState.LOADING
  static readonly INTERRUPTED: number = 4;    //	Characteristic.CurrentMediaState.INTERRUPTED

  static readonly MUTED: boolean = true;      //	Characteristic.Mute
  static readonly UNMUTED: boolean = false;   //	Characteristic.Mute

  private readonly stateStorageKey: string = 'SmartSpeakerState';
  private readonly muteStorageKey: string = 'SmartSpeakerMuteState';
  private readonly volumeStorageKey: string = 'SmartSpeakerVolume';
  private readonly configuredNameStorageKey: string = 'SmartSpeakerConfiguredName';

  private states = {
    CurrentMediaState: SmartSpeaker.STOP,
    TargetMediaState: SmartSpeaker.STOP,
    ConfiguredName: '',
    Mute: SmartSpeaker.UNMUTED,
    Volume: 100,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.CurrentMediaState = SmartSpeaker.STOP;
    this.states.ConfiguredName = this.accessoryConfiguration.accessoryName;
    this.states.Mute = (this.accessoryConfiguration.speaker.mute !== undefined) ? this.accessoryConfiguration.speaker.mute : SmartSpeaker.UNMUTED;
    this.states.Volume = this.accessoryConfiguration.speaker.volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;
      const cachedConfiguredName: string = accessoryState[this.configuredNameStorageKey] as string;

      if (cachedState !== undefined) {
        this.states.CurrentMediaState = cachedState;
      }
      if (cachedMute !== undefined) {
        this.states.Mute = cachedMute;
      }
      if (cachedVolume !== undefined) {
        this.states.Volume = cachedVolume;
      }
      if (cachedConfiguredName !== undefined) {
        this.states.ConfiguredName = cachedConfiguredName;
      }
    }

    this.states.TargetMediaState = this.states.CurrentMediaState;

    // set accessory information
    this.service = this.accessory.getService(this.platform.Service.SmartSpeaker) || this.accessory.addService(this.platform.Service.SmartSpeaker);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.CurrentMediaState)
      .onGet(this.getCurrentMediaState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetMediaState)
      .onSet(this.setTargetMediaState.bind(this))
      .onGet(this.getTargetMediaState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName)
      .onSet(this.setConfiguredName.bind(this))
      .onGet(this.getConfiguredName.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      .onSet(this.setMute.bind(this))
      .onGet(this.getMute.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));
  }

  // Handlers

  async getCurrentMediaState(): Promise<CharacteristicValue> {
    const speakerState = this.states.CurrentMediaState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Media State: ${SmartSpeaker.getStateName(speakerState)}`);

    return speakerState;
  }

  async setTargetMediaState(value: CharacteristicValue) {
    this.states.TargetMediaState = value as number;
    this.states.CurrentMediaState = this.states.TargetMediaState;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Media State: ${SmartSpeaker.getStateName(this.states.TargetMediaState)}`);
  }

  async getTargetMediaState(): Promise<CharacteristicValue> {
    const speakerState = this.states.TargetMediaState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Media State: ${SmartSpeaker.getStateName(speakerState)}`);

    return speakerState;
  }

  async setConfiguredName(value: CharacteristicValue) {
    this.states.ConfiguredName = value as string;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Configured Name: ${this.states.ConfiguredName}`);
  }

  async getConfiguredName(): Promise<CharacteristicValue> {
    const configuredName = this.states.ConfiguredName;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Configured Name: ${configuredName}`);

    return configuredName;
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

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.CurrentMediaState,
      [this.configuredNameStorageKey]: this.states.ConfiguredName,
      [this.muteStorageKey]: this.states.Mute,
      [this.volumeStorageKey]: this.states.Volume,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return SmartSpeaker.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case SmartSpeaker.PLAY: { stateName = 'PLAY'; break; }
    case SmartSpeaker.PAUSE: { stateName = 'PAUSE'; break; }
    case SmartSpeaker.STOP: { stateName = 'STOP'; break; }
    case SmartSpeaker.LOADING: { stateName = 'LOADING'; break; }
    case SmartSpeaker.INTERRUPTED: { stateName = 'INTERRUPTED'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}
