import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * InputSource - Accessory implementation
 */
export class InputSource extends Accessory {

  private static DO_NOT_CREATE_SERVICE: boolean = false;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.InputSource, InputSource.DO_NOT_CREATE_SERVICE);

    let ConfiguredName: string = '';
    let InputSourceType: number = InputSource.HDMI;
    const IsConfigured: number = InputSource.CONFIGURED;
    const CurrentVisibilityState: number = InputSource.SHOWN;
    let Identifier: number = 0;

    // First configure the device based on the accessory details
    ConfiguredName = this.accessoryConfiguration.inputSource!.name;
    InputSourceType = this.accessoryConfiguration.inputSource!.inputSourceType;
    Identifier = this.accessoryConfiguration.inputSource!.identifier;

    // set accessory information
    this.service =
      this.accessory.getService(ConfiguredName) ||
      this.accessory.addService(ServiceType.InputSource, ConfiguredName, accessory.UUID + ConfiguredName);

    this.updateName(ConfiguredName);

    // Update the initial state of the accessory
    this.setConfiguredName(ConfiguredName);
    this.setInputSourceType(InputSourceType);
    this.setIsConfigured(IsConfigured);
    this.setCurrentVisibilityState(CurrentVisibilityState);
    this.setIdentifier(Identifier);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.ConfiguredName)
      .onSet(this.setConfiguredNameHandler.bind(this))
      .onGet(this.getConfiguredNameHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.InputSourceType)
      .onGet(this.getInputSourceTypeHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.IsConfigured)
      .onSet(this.setIsConfiguredHandler.bind(this))
      .onGet(this.getIsConfiguredHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentVisibilityState)
      .onGet(this.getCurrentVisibilityStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Identifier)
      .onGet(this.getIdentifierHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

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
  }

  // InputSourceType

  async getInputSourceTypeHandler(): Promise<CharacteristicValue> {
    const InputSourceType: number = this.getInputSourceType();
    this.log.debug(`[${this.accessoryName}] Getting Input Source Type: ${InputSource.getTypeName(InputSourceType)}`);

    return InputSourceType;
  }

  // IsConfigured

  async getIsConfiguredHandler(): Promise<CharacteristicValue> {
    const IsConfigured: number = this.getIsConfigured();
    this.log.debug(`[${this.accessoryName}] Getting Is Configured: ${InputSource.getIsConfiguredName(IsConfigured)}`);

    return IsConfigured;
  }

  async setIsConfiguredHandler(value: CharacteristicValue) {
    let IsConfigured: number = value as number;
    IsConfigured = this.updateIsConfigured(IsConfigured);
    this.log.info(`[${this.accessoryName}] Setting Is Configured: ${InputSource.getIsConfiguredName(IsConfigured)}`);
  }

  // CurrentVisibilityState

  async getCurrentVisibilityStateHandler(): Promise<CharacteristicValue> {
    const CurrentVisibilityState: number = this.getCurrentVisibilityState();
    this.log.debug(`[${this.accessoryName}] Getting Current Visibility State: ${InputSource.getCurrentVisibilityStateName(CurrentVisibilityState)}`);

    return CurrentVisibilityState;
  }

  // Identifier

  async getIdentifierHandler(): Promise<CharacteristicValue> {
    const Identifier: number = this.getIdentifier();
    this.log.debug(`[${this.accessoryName}] Getting Identifier: ${Identifier}`);

    return Identifier;
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {};

    const json = JSON.stringify(jsonState);
    return json;


    return JSON.stringify({});
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get OTHER(): number            { return CharacteristicType.InputSourceType.OTHER; }
  static get HOME_SCREEN(): number      { return CharacteristicType.InputSourceType.HOME_SCREEN; }
  static get TUNER(): number            { return CharacteristicType.InputSourceType.TUNER; }
  static get HDMI(): number             { return CharacteristicType.InputSourceType.HDMI; }
  static get COMPOSITE_VIDEO(): number  { return CharacteristicType.InputSourceType.COMPOSITE_VIDEO; }
  static get S_VIDEO(): number          { return CharacteristicType.InputSourceType.S_VIDEO; }
  static get COMPONENT_VIDEO(): number  { return CharacteristicType.InputSourceType.COMPONENT_VIDEO; }
  static get DVI(): number              { return CharacteristicType.InputSourceType.DVI; }
  static get AIRPLAY(): number          { return CharacteristicType.InputSourceType.AIRPLAY; }
  static get USB(): number              { return CharacteristicType.InputSourceType.USB; }
  static get APPLICATION(): number      { return CharacteristicType.InputSourceType.APPLICATION; }
  
  static get NOT_CONFIGURED(): number   { return CharacteristicType.IsConfigured.NOT_CONFIGURED; }
  static get CONFIGURED(): number       { return CharacteristicType.IsConfigured.CONFIGURED; }

  static get SHOWN(): number            { return CharacteristicType.CurrentVisibilityState.SHOWN; }
  static get HIDDEN(): number           { return CharacteristicType.CurrentVisibilityState.HIDDEN; }

  static getTypeName(event: number): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case InputSource.OTHER: { name = 'OTHER'; break; }
    case InputSource.HOME_SCREEN: { name = 'HOME SCREEN'; break; }
    case InputSource.TUNER: { name = 'TUNER'; break; }
    case InputSource.HDMI: { name = 'HDMI'; break; }
    case InputSource.COMPOSITE_VIDEO: { name = 'COMPOSITE VIDEO'; break; }
    case InputSource.S_VIDEO: { name = 'S VIDEO'; break; }
    case InputSource.COMPONENT_VIDEO: { name = 'COMPONENT VIDEO'; break; }
    case InputSource.DVI: { name = 'DVI'; break; }
    case InputSource.AIRPLAY: { name = 'AIRPLAY'; break; }
    case InputSource.USB: { name = 'USB'; break; }
    case InputSource.APPLICATION: { name = 'APPLICATION'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }

  static getIsConfiguredName(event: number): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case InputSource.NOT_CONFIGURED: { name = 'NOT CONFIGURED'; break; }
    case InputSource.CONFIGURED: { name = 'CONFIGURED'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }

  static getCurrentVisibilityStateName(event: number): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case InputSource.SHOWN: { name = 'SHOWN'; break; }
    case InputSource.HIDDEN: { name = 'HIDDEN'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }
}
