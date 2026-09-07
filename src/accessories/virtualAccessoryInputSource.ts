import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * InputSource - Accessory implementation
 */
export class InputSource extends Accessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.InputSource;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let ConfiguredName: string = '';
    let InputSourceType: number = InputSource.HDMI;
    const IsConfigured: boolean = true;
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

    this.service.setCharacteristic(this.platform.Characteristic.Name, ConfiguredName);

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
    const IsConfigured: boolean = this.getIsConfigured();
    this.log.debug(`[${this.accessoryName}] Getting Is Configured: ${IsConfigured}`);

    return IsConfigured;
  }

  async setIsConfiguredHandler(value: CharacteristicValue) {
    let IsConfigured: boolean = value as boolean;
    IsConfigured = this.updateIsConfigured(IsConfigured);
    this.log.info(`[${this.accessoryName}] Setting Is Configured: ${IsConfigured}`);
  }

  // CurrentVisibilityState

  async getCurrentVisibilityStateHandler(): Promise<CharacteristicValue> {
    const CurrentVisibilityState: number = this.getCurrentVisibilityState();
    this.log.debug(`[${this.accessoryName}] Getting Current Visibility State: ${InputSource.getVisibilityName(CurrentVisibilityState)}`);

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

  protected getAccessoryService(): WithUUID<typeof Service> {
    return InputSource.ACCESSORY_SERVICE_TYPE;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly OTHER =                 CharacteristicType.InputSourceType.OTHER;
  static readonly HOME_SCREEN =           CharacteristicType.InputSourceType.HOME_SCREEN;
  static readonly TUNER =                 CharacteristicType.InputSourceType.TUNER;
  static readonly HDMI =                  CharacteristicType.InputSourceType.HDMI;
  static readonly COMPOSITE_VIDEO =       CharacteristicType.InputSourceType.COMPOSITE_VIDEO;
  static readonly S_VIDEO =               CharacteristicType.InputSourceType.S_VIDEO;
  static readonly COMPONENT_VIDEO =       CharacteristicType.InputSourceType.COMPONENT_VIDEO;
  static readonly DVI =                   CharacteristicType.InputSourceType.DVI;
  static readonly AIRPLAY =               CharacteristicType.InputSourceType.AIRPLAY;
  static readonly USB =                   CharacteristicType.InputSourceType.USB;
  static readonly APPLICATION =           CharacteristicType.InputSourceType.APPLICATION;
  
  static readonly NOT_CONFIGURED =        CharacteristicType.IsConfigured.NOT_CONFIGURED;
  static readonly CONFIGURED =            CharacteristicType.IsConfigured.CONFIGURED;

  static readonly SHOWN =                 CharacteristicType.CurrentVisibilityState.SHOWN;
  static readonly HIDDEN =                CharacteristicType.CurrentVisibilityState.HIDDEN;

  static getTypeName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case InputSource.OTHER: { eventName = 'OTHER'; break; }
    case InputSource.HOME_SCREEN: { eventName = 'HOME SCREEN'; break; }
    case InputSource.TUNER: { eventName = 'TUNER'; break; }
    case InputSource.HDMI: { eventName = 'HDMI'; break; }
    case InputSource.COMPOSITE_VIDEO: { eventName = 'COMPOSITE VIDEO'; break; }
    case InputSource.S_VIDEO: { eventName = 'S VIDEO'; break; }
    case InputSource.COMPONENT_VIDEO: { eventName = 'COMPONENT VIDEO'; break; }
    case InputSource.DVI: { eventName = 'DVI'; break; }
    case InputSource.AIRPLAY: { eventName = 'AIRPLAY'; break; }
    case InputSource.USB: { eventName = 'USB'; break; }
    case InputSource.APPLICATION: { eventName = 'APPLICATION'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }

  static getConfiguredName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case InputSource.NOT_CONFIGURED: { eventName = 'NOT CONFIGURED'; break; }
    case InputSource.CONFIGURED: { eventName = 'CONFIGURED'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }

  static getVisibilityName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case InputSource.SHOWN: { eventName = 'SHOWN'; break; }
    case InputSource.HIDDEN: { eventName = 'HIDDEN'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}
