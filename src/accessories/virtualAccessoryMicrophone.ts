import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * Microphone - Accessory implementation
 */
export class Microphone extends Accessory {

  private readonly muteStorageKey: string = 'MicrophoneMute';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Microphone);

    let Mute: boolean = Microphone.UNMUTED;
    let Volume: number = 100;

    // First configure the device based on the accessory details
    Volume = this.accessoryConfiguration.microphone.volume;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedMute = accessoryState[this.muteStorageKey] as boolean;

      if (cachedMute !== undefined) {
        Mute = cachedMute;
      }
    }

    // Update the initial state of the accessory
    this.setMute(Mute);
    this.setVolume(Volume);

    // Last register handlers


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

  // Mute

  async getMuteHandler(): Promise<CharacteristicValue> {
    const Mute: boolean = this.getMute();
    this.log.debug(`[${this.accessoryName}] Getting Mute: ${Microphone.getMuteName(Mute)}`);

    return Mute;
  }

  async setMuteHandler(value: CharacteristicValue) {
    let Mute: boolean = value as boolean;
    Mute = this.updateMute(Mute);
    this.log.info(`[${this.accessoryName}] Setting Mute: ${Microphone.getMuteName(Mute)}`);

    this.saveState();
  }

  // Volume

  async getVolumeHandler(): Promise<CharacteristicValue> {
    const Volume: number = this.getVolume();
    this.log.debug(`[${this.accessoryName}] Getting Volume: ${Volume}%`);

    return Volume;
  }

  async setVolumeHandler(value: CharacteristicValue) {
    let Volume = value as number;
    Volume = this.updateVolume(Volume);
    this.log.info(`[${this.accessoryName}] Setting Volume: ${Volume}%`);
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.muteStorageKey]: this.getMute(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get MUTED(): boolean       { return true; }    // CharacteristicType.Mute
  static get UNMUTED(): boolean     { return false; }   // CharacteristicType.Mute

  static getMuteName(event: boolean): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case Microphone.MUTED: { name = 'MUTED'; break; }
    case Microphone.UNMUTED: { name = 'UNMUTED'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }
}
