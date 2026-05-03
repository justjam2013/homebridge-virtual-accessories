import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';
import { Mute } from './accessoryCharacteristics.js';

/**
 * Microphone - Accessory implementation
 */
export class Microphone extends Accessory<typeof Service.Microphone> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Microphone';

  private readonly muteStorageKey: string = 'MicrophoneMute';

  // Device states
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
      platform.Service.Microphone,
      Microphone.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.Volume = this.accessoryConfiguration.microphone.volume;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedMute = accessoryState[this.muteStorageKey] as boolean;

      if (cachedMute !== undefined) {
        this.Mute = cachedMute;
      }
    }

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      .onSet(this.setMute.bind(this))
      .onGet(this.getMute.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Volume)
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));
  }

  // Handlers

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

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.Mute,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }
}
