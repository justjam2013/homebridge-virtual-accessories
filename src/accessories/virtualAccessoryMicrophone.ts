import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * Microphone - Accessory implementation
 */
export class Microphone extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Microphone';

  private readonly muteStorageKey: string = 'MicrophoneMute';

  private states = {
    Mute: false,
    Volume: 100,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.Volume = this.accessoryConfiguration.microphone.volume;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedDoorbellMute = accessoryState[this.muteStorageKey] as boolean;

      if (cachedDoorbellMute !== undefined) {
        this.states.Mute = cachedDoorbellMute;
      }
    }

    this.service = this.accessory.getService(ServiceType.Microphone) || this.accessory.addService(ServiceType.Microphone);

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      .onSet(this.setMute.bind(this))
      .onGet(this.getMute.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));
  }

  // Handlers

  async setMute(value: CharacteristicValue) {
    this.states.Mute = value as boolean;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Mute: ${this.states.Mute}`);
  }

  async getMute(): Promise<CharacteristicValue> {
    const mute: boolean = this.states.Mute;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Mute: ${mute}`);

    return mute;
  }

  async setVolume(value: CharacteristicValue) {
    this.states.Volume = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Volume: ${this.states.Volume}`);
  }

  async getVolume(): Promise<CharacteristicValue> {
    const volume: number = this.states.Volume;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Volume: ${volume}`);

    return volume;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.states.Mute,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Microphone.ACCESSORY_TYPE_NAME;
  }
}
