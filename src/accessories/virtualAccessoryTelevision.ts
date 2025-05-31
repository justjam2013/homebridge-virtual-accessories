import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { ExternalAccessory } from './externalAccessory.js';

import { InputSource } from './virtualAccessoryInputSource.js';
import { TelevisionSpeaker } from './virtualAccessoryTelevisionSpeaker.js';
import { InputSourceConfiguration } from '../configuration/accessories/configurationInputSource.js';

/**
 * Television - Accessory implementation
 */
export class Television extends ExternalAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Television';

  static readonly INACTIVE: number = 0;               // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;                 // Characteristic.Active.ACTIVE

  static readonly NOT_DISCOVERABLE: number = 0;       // Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE
  static readonly ALWAYS_DISCOVERABLE: number = 1;    // Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE

  static readonly REWIND: number = 0;                 // Characteristic.RemoteKey.REWIND
  static readonly FAST_FORWARD: number = 1;           // Characteristic.RemoteKey.FAST_FORWARD
  static readonly NEXT_TRACK: number = 2;             // Characteristic.RemoteKey.NEXT_TRACK
  static readonly PREVIOUS_TRACK: number = 3;         // Characteristic.RemoteKey.PREVIOUS_TRACK
  static readonly ARROW_UP: number = 4;               // Characteristic.RemoteKey.ARROW_UP
  static readonly ARROW_DOWN: number = 5;             // Characteristic.RemoteKey.ARROW_DOWN
  static readonly ARROW_LEFT: number = 6;             // Characteristic.RemoteKey.ARROW_LEFT
  static readonly ARROW_RIGHT: number = 7;	          // Characteristic.RemoteKey.ARROW_RIGHT
  static readonly SELECT: number = 8;	                // Characteristic.RemoteKey.SELECT
  static readonly BACK: number = 9;	                  // Characteristic.RemoteKey.BACK
  static readonly EXIT: number = 10;	                // Characteristic.RemoteKey.EXIT
  static readonly PLAY_PAUSE: number = 11;	          // Characteristic.RemoteKey.PLAY_PAUSE
  static readonly INFORMATION: number = 15;	          // Characteristic.RemoteKey.INFORMATION

  private readonly stateStorageKey: string = 'TelevisionState';
  private readonly inputActiveIdStorageKey: string = 'TelevisionInputActiveId';
  private readonly configuredNameStorageKey: string = 'TelevisionConfiguredName';

  private inputSources: InputSource[] = [];
  private speaker!: TelevisionSpeaker;

  private states = {
    TelevisionState: Television.INACTIVE,
    TelevisionInputActiveId: 0,
    TelevisionConfiguredName: '',
    TelevisionSleepDiscoveryMode: Television.ALWAYS_DISCOVERABLE,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.states.TelevisionConfiguredName = this.accessoryConfiguration.accessoryName;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedInputActiveId: number = accessoryState[this.inputActiveIdStorageKey] as number;
      const cachedConfiguredName: string = accessoryState[this.configuredNameStorageKey] as string;

      if (cachedState !== undefined) {
        this.states.TelevisionState = cachedState;
      }
      if (cachedInputActiveId !== undefined) {
        this.states.TelevisionInputActiveId = cachedInputActiveId;
      }
      if (cachedConfiguredName !== undefined) {
        this.states.TelevisionConfiguredName = cachedConfiguredName;
      }
    }

    // set accessory information
    this.service = this.accessory.getService(this.platform.Service.Television) || this.accessory.addService(this.platform.Service.Television);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onSet(this.setActiveIdentifier.bind(this))
      .onGet(this.getActiveIdentifier.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName)
      .onSet(this.setConfiguredName.bind(this))
      .onGet(this.getConfiguredName.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RemoteKey)
      .onSet(this.setRemoteKey.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SleepDiscoveryMode)
      .onGet(this.getSleepDiscoveryMode.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    this.accessoryConfiguration.television.getInputSources().forEach(inputSourceConfig => {
      // Enrich configuration with "inputSource" settings
      const tempHolder: InputSourceConfiguration = this.accessoryConfiguration.inputSource;
      this.accessoryConfiguration.inputSource = inputSourceConfig;

      const inputSource: InputSource = new InputSource(this.platform, this.accessory);

      // Remove configuration enrichments
      this.accessoryConfiguration.inputSource = tempHolder;

      this.inputSources.push(inputSource);
    });


    if (this.accessoryConfiguration.television.hasAudio) {
      this.speaker = new TelevisionSpeaker(this.platform, this.accessory);
    }
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.states.TelevisionState = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Television.getStateName(this.states.TelevisionState)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const televisionState = this.states.TelevisionState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Television.getStateName(televisionState)}`);

    return televisionState;
  }

  async setActiveIdentifier(value: CharacteristicValue) {
    this.states.TelevisionInputActiveId = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Input Active Identifier: ${this.states.TelevisionInputActiveId}`);
  }

  async getActiveIdentifier(): Promise<CharacteristicValue> {
    const inputActiveId = this.states.TelevisionInputActiveId;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Input Active Identifier: ${inputActiveId}`);

    return inputActiveId;
  }

  async setConfiguredName(value: CharacteristicValue) {
    this.states.TelevisionConfiguredName = value as string;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Configured Name: ${this.states.TelevisionConfiguredName}`);
  }

  async getConfiguredName(): Promise<CharacteristicValue> {
    const televisionConfiguredName = this.states.TelevisionConfiguredName;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Configured Name: ${televisionConfiguredName}`);

    return televisionConfiguredName;
  }

  async setRemoteKey(value: CharacteristicValue) {
    const remoteKey = value as number;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Remote Key: ${Television.getKeyName(remoteKey)}`);
  }

  async getSleepDiscoveryMode(): Promise<CharacteristicValue> {
    const sleepDiscoveryMode = this.states.TelevisionSleepDiscoveryMode;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Sleep Discovery Mode: ${sleepDiscoveryMode}`);

    return sleepDiscoveryMode;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.TelevisionState,
      [this.inputActiveIdStorageKey]: this.states.TelevisionInputActiveId,
      [this.configuredNameStorageKey]: this.states.TelevisionConfiguredName,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Television.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Television.INACTIVE: { stateName = 'INACTIVE'; break; }
    case Television.ACTIVE: { stateName = 'ACTIVE'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }

  static getKeyName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Television.REWIND: { stateName = 'REWIND'; break; }
    case Television.FAST_FORWARD: { stateName = 'FAST FORWARD'; break; }
    case Television.NEXT_TRACK: { stateName = 'NEXT TRACK'; break; }
    case Television.PREVIOUS_TRACK: { stateName = 'PREVIOUS TRACK'; break; }
    case Television.ARROW_UP: { stateName = 'ARROW UP'; break; }
    case Television.ARROW_DOWN: { stateName = 'ARROW DOWN'; break; }
    case Television.ARROW_LEFT: { stateName = 'ARROW LEFT'; break; }
    case Television.ARROW_RIGHT: { stateName = 'ARROW RIGHT'; break; }
    case Television.SELECT: { stateName = 'SELECT'; break; }
    case Television.BACK: { stateName = 'BACK'; break; }
    case Television.EXIT: { stateName = 'EXIT'; break; }
    case Television.PLAY_PAUSE: { stateName = 'PLAY PAUSE'; break; }
    case Television.INFORMATION: { stateName = 'INFORMATION'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}
