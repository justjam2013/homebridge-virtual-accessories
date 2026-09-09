import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

import { InputSource } from './virtualAccessoryInputSource.js';
import { InputSourceConfiguration } from '../configuration/accessories/configurationInputSource.js';

/**
 * Television - Accessory implementation
 */
export class Television extends ExternalAccessory {

  private readonly stateStorageKey: string = 'TelevisionState';
  private readonly inputActiveIdStorageKey: string = 'TelevisionInputActiveId';
  private readonly configuredNameStorageKey: string = 'TelevisionConfiguredName';

  private inputSources: InputSource[] = [];

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Television);

    let Active: number = Television.INACTIVE;
    let ActiveIdentifier: number = 0;
    let ConfiguredName: string = '';
    const SleepDiscoveryMode: number = Television.ALWAYS_DISCOVERABLE;

    // First configure the device based on the accessory details
    ConfiguredName = this.accessoryName;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedInputActiveId: number = accessoryState[this.inputActiveIdStorageKey] as number;
      const cachedConfiguredName: string = accessoryState[this.configuredNameStorageKey] as string;

      if (cachedState !== undefined) {
        Active = cachedState;
      }
      if (cachedInputActiveId !== undefined) {
        ActiveIdentifier = cachedInputActiveId;
      }
      if (cachedConfiguredName !== undefined) {
        ConfiguredName = cachedConfiguredName;
      }
    }

    // Update the initial state of the accessory
    this.setActive(Active);
    this.setActiveIdentifier(ActiveIdentifier);
    this.setConfiguredName(ConfiguredName);
    this.setSleepDiscoveryMode(SleepDiscoveryMode);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.Active)
      .onSet(this.setActiveHelper.bind(this))
      .onGet(this.getActiveHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.ActiveIdentifier)
      .onSet(this.setActiveIdentifierHelper.bind(this))
      .onGet(this.getActiveIdentifierHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.ConfiguredName)
      .onSet(this.setConfiguredNameHelper.bind(this))
      .onGet(this.getConfiguredNameHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.RemoteKey)
      .onSet(this.setRemoteKeyHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.SleepDiscoveryMode)
      .onGet(this.getSleepDiscoveryModeHelper.bind(this));

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

      const inputSource: InputSource = new InputSource(this.platform, this.accessory, this.accessoryConfiguration);
      this.service!.addLinkedService(inputSource.service!);

      // Remove configuration enrichments
      this.accessoryConfiguration.inputSource = tempHolder;

      this.inputSources.push(inputSource);
    });
  }

  //
  // ****************************** Handlers ******************************
  //

  // Active

  async getActiveHelper(): Promise<CharacteristicValue> {
    const Active: number = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting Active: ${Television.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHelper(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting State: ${Television.getActiveName(Active)}`);

    this.saveState();
  }

  // ActiveIdentifier

  async getActiveIdentifierHelper(): Promise<CharacteristicValue> {
    const ActiveIdentifier: number = this.getActiveIdentifier();
    this.log.debug(`[${this.accessoryName}] Getting Input Active Identifier: ${ActiveIdentifier}`);

    return ActiveIdentifier;
  }

  async setActiveIdentifierHelper(value: CharacteristicValue) {
    let ActiveIdentifier: number = value as number;
    ActiveIdentifier = this.updateActiveIdentifier(ActiveIdentifier);
    this.log.info(`[${this.accessoryName}] Setting Input Active Identifier: ${ActiveIdentifier}`);
  }

  //ConfiguredName

  async getConfiguredNameHelper(): Promise<CharacteristicValue> {
    const ConfiguredName: string = this.getConfiguredName();
    this.log.debug(`[${this.accessoryName}] Getting Configured Name: ${ConfiguredName}`);

    return ConfiguredName;
  }

  async setConfiguredNameHelper(value: CharacteristicValue) {
    let ConfiguredName: string = value as string;
    ConfiguredName = this.updateConfiguredName(ConfiguredName);
    this.log.info(`[${this.accessoryName}] Setting Configured Name: ${ConfiguredName}`);

    this.saveState();
  }

  // RemoteKey

  async setRemoteKeyHelper(value: CharacteristicValue) {
    let RemoteKey: number = value as number;
    RemoteKey = this.updateRemoteKey(RemoteKey);
    this.log.debug(`[${this.accessoryName}] Setting Remote Key: ${Television.getRemoteKeyName(RemoteKey)}`);
  }

  // SleepDiscoveryMode

  async getSleepDiscoveryModeHelper(): Promise<CharacteristicValue> {
    const SleepDiscoveryMode = this.getSleepDiscoveryMode();
    this.log.debug(`[${this.accessoryName}] Getting Sleep Discovery Mode: ${SleepDiscoveryMode}`);

    return SleepDiscoveryMode;
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getActive(),
      [this.inputActiveIdStorageKey]: this.getActiveIdentifier(),
      [this.configuredNameStorageKey]: this.getConfiguredName(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get INACTIVE(): number             { return CharacteristicType.Active.INACTIVE; }
  static get ACTIVE(): number               { return CharacteristicType.Active.ACTIVE; }

  static get NOT_DISCOVERABLE(): number     { return CharacteristicType.SleepDiscoveryMode.NOT_DISCOVERABLE; }
  static get ALWAYS_DISCOVERABLE(): number  { return CharacteristicType.SleepDiscoveryMode.ALWAYS_DISCOVERABLE; }

  static get REWIND(): number               { return CharacteristicType.RemoteKey.REWIND; }
  static get FAST_FORWARD(): number         { return CharacteristicType.RemoteKey.FAST_FORWARD; }
  static get NEXT_TRACK(): number           { return CharacteristicType.RemoteKey.NEXT_TRACK; }
  static get PREVIOUS_TRACK(): number       { return CharacteristicType.RemoteKey.PREVIOUS_TRACK; }
  static get ARROW_UP(): number             { return CharacteristicType.RemoteKey.ARROW_UP; }
  static get ARROW_DOWN(): number           { return CharacteristicType.RemoteKey.ARROW_DOWN; }
  static get ARROW_LEFT(): number           { return CharacteristicType.RemoteKey.ARROW_LEFT; }
  static get ARROW_RIGHT(): number          { return CharacteristicType.RemoteKey.ARROW_RIGHT; }
  static get SELECT(): number               { return CharacteristicType.RemoteKey.SELECT; }
  static get BACK(): number                 { return CharacteristicType.RemoteKey.BACK; }
  static get EXIT(): number                 { return CharacteristicType.RemoteKey.EXIT; }
  static get PLAY_PAUSE(): number           { return CharacteristicType.RemoteKey.PLAY_PAUSE; }
  static get INFORMATION(): number          { return CharacteristicType.RemoteKey.INFORMATION; }

  static getActiveName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Television.INACTIVE: { name = 'INACTIVE'; break; }
    case Television.ACTIVE: { name = 'ACTIVE'; break; }
    default: { name = state.toString();}
    }

    return name;
  }

  static getSleepDiscoveryModeName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Television.NOT_DISCOVERABLE: { name = 'NOT DISCOVERABLE'; break; }
    case Television.ALWAYS_DISCOVERABLE: { name = 'ALWAYS DISCOVERABLE'; break; }
    default: { name = state.toString();}
    }

    return name;
  }

  static getRemoteKeyName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Television.REWIND: { name = 'REWIND'; break; }
    case Television.FAST_FORWARD: { name = 'FAST FORWARD'; break; }
    case Television.NEXT_TRACK: { name = 'NEXT TRACK'; break; }
    case Television.PREVIOUS_TRACK: { name = 'PREVIOUS TRACK'; break; }
    case Television.ARROW_UP: { name = 'ARROW UP'; break; }
    case Television.ARROW_DOWN: { name = 'ARROW DOWN'; break; }
    case Television.ARROW_LEFT: { name = 'ARROW LEFT'; break; }
    case Television.ARROW_RIGHT: { name = 'ARROW RIGHT'; break; }
    case Television.SELECT: { name = 'SELECT'; break; }
    case Television.BACK: { name = 'BACK'; break; }
    case Television.EXIT: { name = 'EXIT'; break; }
    case Television.PLAY_PAUSE: { name = 'PLAY PAUSE'; break; }
    case Television.INFORMATION: { name = 'INFORMATION'; break; }
    default: { name = state.toString();}
    }

    return name;
  }
}
