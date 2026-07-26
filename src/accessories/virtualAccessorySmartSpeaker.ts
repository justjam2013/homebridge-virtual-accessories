import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';
import { CurrentMediaState, Mute, TargetMediaState } from './accessoryCharacteristics.js';

/**
 * SmartSpeaker - Accessory implementation
 */
export class SmartSpeaker extends ExternalAccessory<typeof Service.SmartSpeaker> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'SmartSpeaker';

  private readonly stateStorageKey: string = 'SmartSpeakerState';
  private readonly muteStorageKey: string = 'SmartSpeakerMuteState';
  private readonly volumeStorageKey: string = 'SmartSpeakerVolume';
  private readonly configuredNameStorageKey: string = 'SmartSpeakerConfiguredName';

  // Device states
  private CurrentMediaState: number = CurrentMediaState.STOP;
  private TargetMediaState: number = TargetMediaState.STOP;
  private ConfiguredName: string = '';
  private Mute: boolean = Mute.UNMUTED;
  private Volume: number = 100;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,accessory,accessoryConfiguration,
      platform.Service.SmartSpeaker,
      SmartSpeaker.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.CurrentMediaState = CurrentMediaState.STOP;
    this.ConfiguredName = this.accessoryName;
    this.Mute = (this.accessoryConfiguration.speaker.mute !== undefined) ? this.accessoryConfiguration.speaker.mute : Mute.UNMUTED;
    this.Volume = this.accessoryConfiguration.speaker.volume;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedMute: boolean = accessoryState[this.muteStorageKey] as boolean;
      const cachedVolume: number = accessoryState[this.volumeStorageKey] as number;
      const cachedConfiguredName: string = accessoryState[this.configuredNameStorageKey] as string;

      if (cachedState !== undefined) {
        this.CurrentMediaState = cachedState;
      }
      if (cachedMute !== undefined) {
        this.Mute = cachedMute;
      }
      if (cachedVolume !== undefined) {
        this.Volume = cachedVolume;
      }
      if (cachedConfiguredName !== undefined) {
        this.ConfiguredName = cachedConfiguredName;
      }
    }

    this.TargetMediaState = this.CurrentMediaState;

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
    const speakerState = this.CurrentMediaState;

    this.log.debug(`[${this.accessoryName}] Getting Current Media State: ${CurrentMediaState.getName(speakerState)}`);

    return speakerState;
  }

  async setTargetMediaState(value: CharacteristicValue) {
    this.TargetMediaState = value as number;
    this.CurrentMediaState = this.TargetMediaState;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Target Media State: ${TargetMediaState.getName(this.TargetMediaState)}`);
  }

  async getTargetMediaState(): Promise<CharacteristicValue> {
    const speakerState = this.TargetMediaState;

    this.log.debug(`[${this.accessoryName}] Getting Target Media State: ${TargetMediaState.getName(speakerState)}`);

    return speakerState;
  }

  async setConfiguredName(value: CharacteristicValue) {
    this.ConfiguredName = value as string;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Configured Name: ${this.ConfiguredName}`);
  }

  async getConfiguredName(): Promise<CharacteristicValue> {
    const configuredName = this.ConfiguredName;

    this.log.debug(`[${this.accessoryName}] Getting Configured Name: ${configuredName}`);

    return configuredName;
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
      [this.stateStorageKey]: this.CurrentMediaState,
      [this.configuredNameStorageKey]: this.ConfiguredName,
      [this.muteStorageKey]: this.Mute,
      [this.volumeStorageKey]: this.Volume,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }
}
