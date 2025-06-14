import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * InputSource - Accessory implementation
 */
export class InputSource extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'InputSource';

  static readonly OTHER = 0;              // Characteristic.InputSourceType.OTHER
  static readonly HOME_SCREEN = 1;        // Characteristic.InputSourceType.HOME_SCREEN
  static readonly TUNER = 2;              // Characteristic.InputSourceType.TUNER
  static readonly HDMI = 3;               // Characteristic.InputSourceType.HDMI
  static readonly COMPOSITE_VIDEO = 4;    // Characteristic.InputSourceType.COMPOSITE_VIDEO
  static readonly S_VIDEO = 5;            // Characteristic.InputSourceType.S_VIDEO
  static readonly COMPONENT_VIDEO = 6;    // Characteristic.InputSourceType.COMPONENT_VIDEO
  static readonly DVI = 7;                // Characteristic.InputSourceType.DVI
  static readonly AIRPLAY = 8;            // Characteristic.InputSourceType.AIRPLAY
  static readonly USB = 9;                // Characteristic.InputSourceType.USB
  static readonly APPLICATION = 10;       // Characteristic.InputSourceType.APPLICATION
  
  static readonly NOT_CONFIGURED = 0;     // Characteristic.IsConfigured.NOT_CONFIGURED
  static readonly CONFIGURED = 1;         // Characteristic.IsConfigured.CONFIGURED

  static readonly SHOWN = 0;              // Characteristic.CurrentVisibilityState.SHOWN
  static readonly HIDDEN = 1;             // Characteristic.CurrentVisibilityState.HIDDEN

  private states = {
    InputSourceConfiguredName: '',
    InputSourceType: InputSource.HDMI,
    InputSourceIsConfigured: true,
    InputSourceCurrentVisibilityState: InputSource.SHOWN,
    InputSourceIdentifier: 0,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    const inputName: string = this.accessoryConfiguration.inputSource!.name;

    // First configure the device based on the accessory details
    this.states.InputSourceConfiguredName = inputName;
    this.states.InputSourceType = this.accessoryConfiguration.inputSource!.inputSourceType;
    this.states.InputSourceIdentifier = this.accessoryConfiguration.inputSource!.identifier;

    // set accessory information
    this.service = this.accessory.getService(inputName) ||
                   this.accessory.addService(this.platform.Service.InputSource, inputName, accessory.UUID + inputName);

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
    // this.states.InputSourceConfiguredName = value as string;
    const configuredName = value as string;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Configured Name: ${configuredName}`);
  }

  async getConfiguredName(): Promise<CharacteristicValue> {
    const configuredName = this.states.InputSourceConfiguredName;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Configured Name: ${configuredName}`);

    return configuredName;
  }

  async getInputSourceType(): Promise<CharacteristicValue> {
    const inputSourceType = this.states.InputSourceType as number;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Input Source Type: ${InputSource.getTypeName(inputSourceType)}`);

    return inputSourceType;
  }

  async setIsConfigured(value: CharacteristicValue) {
    // this.states.InputSourceIsConfigured = value as boolean;
    const isConfigured = value as boolean;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Is Configured: ${isConfigured}`);
  }

  async getIsConfigured(): Promise<CharacteristicValue> {
    const isConfigured = this.states.InputSourceIsConfigured;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Is Configured: ${isConfigured}`);

    return isConfigured;
  }

  async getCurrentVisibilityState(): Promise<CharacteristicValue> {
    const currentVisibilityState = this.states.InputSourceCurrentVisibilityState as number;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Visibility State: ${InputSource.getVisibilityName(currentVisibilityState)}`);

    return currentVisibilityState;
  }

  async getIdentifier(): Promise<CharacteristicValue> {
    const identifier = this.states.InputSourceIdentifier as number;
     
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Identifier: ${identifier}`);

    return identifier;
  }

  protected getJsonState(): string {
    return JSON.stringify({});
  }

  protected getAccessoryTypeName(): string {
    return InputSource.ACCESSORY_TYPE_NAME;
  }

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
