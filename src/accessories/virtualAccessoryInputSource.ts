import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';
import { CurrentVisibilityState, InputSourceType } from './accessoryCharacteristics.js';

/**
 * InputSource - Accessory implementation
 */
export class InputSource extends Accessory<typeof Service.InputSource> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'InputSource';

  // Device states
  private ConfiguredName: string = '';
  private Type: number = InputSourceType.HDMI;
  private IsConfigured: boolean = true;
  private CurrentVisibilityState: number = CurrentVisibilityState.SHOWN;
  private Identifier: number = 0;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.InputSource,
      InputSource.ACCESSORY_TYPE_NAME,
    );

    const inputName: string = this.accessoryConfiguration.inputSource!.name;

    // First configure the device based on the accessory details
    this.ConfiguredName = inputName;
    this.Type = this.accessoryConfiguration.inputSource!.inputSourceType;
    this.Identifier = this.accessoryConfiguration.inputSource!.identifier;

    // override accessory service
    this.service = this.accessory.getService(inputName) ||
                   this.accessory.addService(this.platform.Service.InputSource, inputName, accessory.UUID + inputName);

    // override accessory name
    this.service.setCharacteristic(this.platform.Characteristic.Name, inputName);

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName)
      .onSet(this.setConfiguredName.bind(this))
      .onGet(this.getConfiguredName.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.InputSourceType)
      .onGet(this.getInputSourceType.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.IsConfigured)
      .onSet(this.setIsConfigured.bind(this))
      .onGet(this.getIsConfigured.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentVisibilityState)
      .onGet(this.getCurrentVisibilityState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Identifier)
      .onGet(this.getIdentifier.bind(this));
  }

  // Handlers

  async setConfiguredName(value: CharacteristicValue) {
    // this.InputSourceConfiguredName = value as string;
    const configuredName = value as string;

    this.log.info(`[${this.accessoryName}] Setting Configured Name: ${configuredName}`);
  }

  async getConfiguredName(): Promise<CharacteristicValue> {
    const configuredName = this.ConfiguredName;

    this.log.debug(`[${this.accessoryName}] Getting Configured Name: ${configuredName}`);

    return configuredName;
  }

  async getInputSourceType(): Promise<CharacteristicValue> {
    const inputSourceType = this.Type as number;

    this.log.debug(`[${this.accessoryName}] Getting Input Source Type: ${InputSourceType.getName(inputSourceType)}`);

    return inputSourceType;
  }

  async setIsConfigured(value: CharacteristicValue) {
    // this.IsConfigured = value as boolean;
    const isConfigured = value as boolean;

    this.log.info(`[${this.accessoryName}] Setting Is Configured: ${isConfigured}`);
  }

  async getIsConfigured(): Promise<CharacteristicValue> {
    const isConfigured = this.IsConfigured;

    this.log.debug(`[${this.accessoryName}] Getting Is Configured: ${isConfigured}`);

    return isConfigured;
  }

  async getCurrentVisibilityState(): Promise<CharacteristicValue> {
    const currentVisibilityState = this.CurrentVisibilityState as number;

    this.log.debug(`[${this.accessoryName}] Getting Current Visibility State: ${CurrentVisibilityState.getName(currentVisibilityState)}`);

    return currentVisibilityState;
  }

  async getIdentifier(): Promise<CharacteristicValue> {
    const identifier = this.Identifier as number;
     
    this.log.debug(`[${this.accessoryName}] Getting Identifier: ${identifier}`);

    return identifier;
  }

  //

  protected override getJsonState(): string {
    return JSON.stringify({});
  }
}
