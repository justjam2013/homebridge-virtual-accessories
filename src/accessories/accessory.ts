 
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Categories, Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

import { VirtualLogger } from '../utils/virtualLogger.js';

import fs from 'fs';

/**
 * Abstract Accessory
 */
export abstract class Accessory {
  service!: Service;

  readonly platform: VirtualAccessoriesPlatform;
  readonly accessory: PlatformAccessory;

  readonly accessoryConfiguration: AccessoryConfiguration;
  readonly log: VirtualLogger;

  protected accessoryName: string = '';
  protected defaultState!: number | boolean;

  protected storagePath: string;

  protected accessoryInformationService?: Service;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    // The accessory configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.accessoryConfiguration = accessoryConfiguration;
    this.accessoryName = this.accessoryConfiguration.accessoryName;
    this.log = this.platform.log;

    this.log.debug(`[${this.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.storagePath = accessory.context.storagePath;

    if (!this.accessoryConfiguration.accessoryIsStateful) {
      this.deleteAccessoryState(this.storagePath);
    }

    // set accessory information
    this.accessoryInformationService = this.accessory.getService(ServiceType.AccessoryInformation);
    this.accessoryInformationService!
      .setCharacteristic(CharacteristicType.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(CharacteristicType.Model, `Virtual Accessory - ${this.getAccessoryTypeName()}`)
      .setCharacteristic(CharacteristicType.SerialNumber, this.accessory.UUID)
      .setCharacteristic(CharacteristicType.Name, this.accessoryName)
      .setCharacteristic(CharacteristicType.FirmwareRevision, this.accessory.context.firmwareVersion);
  }

  isExternalAccessory(): boolean {
    return [Categories.SPEAKER, Categories.TELEVISION].includes(this.accessory.category);
  }

  updateConfiguredName() {
    const configuredName = this.accessoryInformationService!.getCharacteristic(CharacteristicType.ConfiguredName);
    if (configuredName !== undefined) {
      this.accessoryInformationService!.removeCharacteristic(configuredName);
    }
  }

  private readonly EMPTY_ACCESSORY_STATE = '{}';

  protected isEmptyAccessoryState(json: any) {
    return JSON.stringify(json) === this.EMPTY_ACCESSORY_STATE;
  }

  protected loadAccessoryState(
    storagePath: string,
  ): any {
    let contents = this.EMPTY_ACCESSORY_STATE;
    if (fs.existsSync(storagePath)) {
      contents = fs.readFileSync(storagePath, 'utf8');
    }

    const json = JSON.parse(contents);

    this.log.debug(`[${this.accessoryName}] Loading state: ${JSON.stringify(json)}`);
    return json;
  }

  private saveAccessoryState(
    storagePath: string,
    stateJson: string,
  ): void {
    // Overwrite the existing persistence file
    this.log.debug(`[${this.accessoryName}] Saving state: ${stateJson}`);
    try {
      fs.writeFileSync(
        storagePath,
        stateJson,
        { encoding: 'utf8', flag: 'w' },
      );

      this.log.debug(`[${this.accessoryName}] Saved state: ${stateJson}`);
    } catch (error) {
      this.log.error(`[${this.accessoryName}] Error saving state: ${error}`);
    }
  }

  protected deleteAccessoryState(
    storagePath: string,
  ) {
    this.log.debug(`[${this.accessoryName}] Deleting state file ${storagePath}`);
    if (fs.existsSync(storagePath)) {
      try {
        fs.unlinkSync(storagePath); 
      } catch (err) {
        this.log.error(`[${this.accessoryName}] Error deleting state file ${storagePath}`);
      }
    }
  }

  // Store device state if stateful
  protected storeState() {
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }
  }

  protected abstract getAccessoryTypeName(): string;

  protected abstract getJsonState(): string;

  // Convenience methods

  protected getValue(
    characteristic: WithUUID<new () => Characteristic>,
  ): CharacteristicValue {
    return this.service.getCharacteristic(characteristic).value as CharacteristicValue;
  }

  protected setValue(
    characteristic: WithUUID<new () => Characteristic>,
    value: CharacteristicValue,
  ) {
    this.service.setCharacteristic(characteristic, value);
  }

  protected updateValue(
    characteristic: WithUUID<new () => Characteristic>,
    value: CharacteristicValue,
  ) {
    this.service.updateCharacteristic(characteristic, value);
  }
}
