import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

/**
 * SmartSpeaker - Accessory implementation
 */
export class SmartSpeaker extends ExternalAccessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.SmartSpeaker;

  private readonly stateStorageKey: string = 'SmartSpeakerState';
  private readonly muteStorageKey: string = 'SmartSpeakerMuteState';
  private readonly volumeStorageKey: string = 'SmartSpeakerVolume';
  private readonly configuredNameStorageKey: string = 'SmartSpeakerConfiguredName';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

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
    this.log.debug(`[${this.accessoryName}] Getting Current Media State: ${SmartSpeaker.getStateName(CurrentMediaState)}`);

    return CurrentMediaState;
  }

  // TargetMediaState

  async getTargetMediaStateHandler(): Promise<CharacteristicValue> {
    const TargetMediaState = this.getTargetMediaState();

    this.log.debug(`[${this.accessoryName}] Getting Target Media State: ${SmartSpeaker.getStateName(TargetMediaState)}`);

    return TargetMediaState;
  }

  async setTargetMediaStateHandler(value: CharacteristicValue) {
    let TargetMediaState: number = value as number;
    TargetMediaState = this.updateTargetMediaState(TargetMediaState);
    this.log.info(`[${this.accessoryName}] Setting Target Media State: ${SmartSpeaker.getStateName(TargetMediaState)}`);

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
    this.log.debug(`[${this.accessoryName}] Getting Volume: ${Volume}`);

    return Volume;
  }

  async setVolumeHandler(value: CharacteristicValue) {
    let Volume: number = value as number;
    Volume = this.updateVolume(Volume);
    this.log.info(`[${this.accessoryName}] Setting Volume: ${Volume}`);
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

  protected getAccessoryService(): WithUUID<typeof Service> {
    return SmartSpeaker.ACCESSORY_SERVICE_TYPE;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly PLAY: number =                CharacteristicType.CurrentMediaState.PLAY;    // Characteristic.TargetMediaState.PLAY
  static readonly PAUSE: number =               CharacteristicType.CurrentMediaState.PAUSE;   // Characteristic.TargetMediaState.PAUSE;
  static readonly STOP: number =                CharacteristicType.CurrentMediaState.STOP;    // Characteristic.TargetMediaState.STOP;
  static readonly LOADING: number =             CharacteristicType.CurrentMediaState.LOADING;
  static readonly INTERRUPTED: number =         CharacteristicType.CurrentMediaState.INTERRUPTED;

  static readonly MUTED: boolean = true;        // CharacteristicType.Mute
  static readonly UNMUTED: boolean = false;     // CharacteristicType.Mute

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
