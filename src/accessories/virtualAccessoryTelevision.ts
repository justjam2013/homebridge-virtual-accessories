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
    this.log.debug(`[${this.accessoryName}] Getting Active: ${Television.getStateName(Active)}`);

    return Active;
  }

  async setActiveHelper(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting State: ${Television.getStateName(Active)}`);

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
    this.log.debug(`[${this.accessoryName}] Setting Remote Key: ${Television.getKeyName(RemoteKey)}`);
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
      [this.configuredNameStorageKey]: this.getConfiguredName,
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly INACTIVE: number =                  CharacteristicType.Active.INACTIVE;
  static readonly ACTIVE: number =                    CharacteristicType.Active.ACTIVE;

  static readonly NOT_DISCOVERABLE: number =          CharacteristicType.SleepDiscoveryMode.NOT_DISCOVERABLE;
  static readonly ALWAYS_DISCOVERABLE: number =       CharacteristicType.SleepDiscoveryMode.ALWAYS_DISCOVERABLE;

  static readonly REWIND: number =                    CharacteristicType.RemoteKey.REWIND;
  static readonly FAST_FORWARD: number =              CharacteristicType.RemoteKey.FAST_FORWARD;
  static readonly NEXT_TRACK: number =                CharacteristicType.RemoteKey.NEXT_TRACK;
  static readonly PREVIOUS_TRACK: number =            CharacteristicType.RemoteKey.PREVIOUS_TRACK;
  static readonly ARROW_UP: number =                  CharacteristicType.RemoteKey.ARROW_UP;
  static readonly ARROW_DOWN: number =                CharacteristicType.RemoteKey.ARROW_DOWN;
  static readonly ARROW_LEFT: number =                CharacteristicType.RemoteKey.ARROW_LEFT;
  static readonly ARROW_RIGHT: number =               CharacteristicType.RemoteKey.ARROW_RIGHT;
  static readonly SELECT: number =                    CharacteristicType.RemoteKey.SELECT;
  static readonly BACK: number =                      CharacteristicType.RemoteKey.BACK;
  static readonly EXIT: number =                      CharacteristicType.RemoteKey.EXIT;
  static readonly PLAY_PAUSE: number =                CharacteristicType.RemoteKey.PLAY_PAUSE;
  static readonly INFORMATION: number =               CharacteristicType.RemoteKey.INFORMATION;

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
