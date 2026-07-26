import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { ExternalAccessory } from './externalAccessory.js';

import { InputSource } from './virtualAccessoryInputSource.js';
import { InputSourceConfiguration } from '../configuration/accessories/configurationInputSource.js';
import { Active, RemoteKey, SleepDiscoveryMode } from './accessoryCharacteristics.js';

/**
 * Television - Accessory implementation
 */
export class Television extends ExternalAccessory<typeof Service.Television> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Television';

  private readonly stateStorageKey: string = 'TelevisionState';
  private readonly inputActiveIdStorageKey: string = 'TelevisionInputActiveId';
  private readonly configuredNameStorageKey: string = 'TelevisionConfiguredName';

  private inputSources: InputSource[] = [];

  // Device states
  private Active: number = Active.INACTIVE;
  private InputActiveId: number = 0;
  private ConfiguredName: string = '';
  private SleepDiscoveryMode: number = SleepDiscoveryMode.ALWAYS_DISCOVERABLE;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Television,
      Television.ACCESSORY_TYPE_NAME,
    );

    this.ConfiguredName = this.accessoryName;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedInputActiveId: number = accessoryState[this.inputActiveIdStorageKey] as number;
      const cachedConfiguredName: string = accessoryState[this.configuredNameStorageKey] as string;

      if (cachedState !== undefined) {
        this.Active = cachedState;
      }
      if (cachedInputActiveId !== undefined) {
        this.InputActiveId = cachedInputActiveId;
      }
      if (cachedConfiguredName !== undefined) {
        this.ConfiguredName = cachedConfiguredName;
      }
    }

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

      const inputSource: InputSource = new InputSource(this.platform, this.accessory, this.accessoryConfiguration);
      this.service!.addLinkedService(inputSource.service!);

      // Remove configuration enrichments
      this.accessoryConfiguration.inputSource = tempHolder;

      this.inputSources.push(inputSource);
    });
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.Active = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting State: ${Active.getName(this.Active)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const televisionState = this.Active;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Active.getName(televisionState)}`);

    return televisionState;
  }

  async setActiveIdentifier(value: CharacteristicValue) {
    this.InputActiveId = value as number;

    this.log.info(`[${this.accessoryName}] Setting Input Active Identifier: ${this.InputActiveId}`);
  }

  async getActiveIdentifier(): Promise<CharacteristicValue> {
    const inputActiveId = this.InputActiveId;

    this.log.debug(`[${this.accessoryName}] Getting Input Active Identifier: ${inputActiveId}`);

    return inputActiveId;
  }

  async setConfiguredName(value: CharacteristicValue) {
    this.ConfiguredName = value as string;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Configured Name: ${this.ConfiguredName}`);
  }

  async getConfiguredName(): Promise<CharacteristicValue> {
    const televisionConfiguredName = this.ConfiguredName;

    this.log.debug(`[${this.accessoryName}] Getting Configured Name: ${televisionConfiguredName}`);

    return televisionConfiguredName;
  }

  async setRemoteKey(value: CharacteristicValue) {
    const remoteKey = value as number;

    this.log.debug(`[${this.accessoryName}] Setting Remote Key: ${RemoteKey.getName(remoteKey)}`);
  }

  async getSleepDiscoveryMode(): Promise<CharacteristicValue> {
    const sleepDiscoveryMode = this.SleepDiscoveryMode;

    this.log.debug(`[${this.accessoryName}] Getting Sleep Discovery Mode: ${SleepDiscoveryMode.getName(sleepDiscoveryMode)}`);

    return sleepDiscoveryMode;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.Active,
      [this.inputActiveIdStorageKey]: this.InputActiveId,
      [this.configuredNameStorageKey]: this.ConfiguredName,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }
}
