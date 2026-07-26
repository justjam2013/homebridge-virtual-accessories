/* eslint-disable brace-style */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ConstructorArgs, PlatformAccessory, Service } from 'homebridge';
import { Categories } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

import { VirtualLogger } from '../utils/virtualLogger.js';

import fs from 'fs';

/**
 * Abstract Accessory
 */
export abstract class Accessory<S extends typeof Service> {
  service: Service;
  readonly accessoryInformationService: Service;

  readonly platform: VirtualAccessoriesPlatform;
  readonly accessory: PlatformAccessory;

  readonly accessoryConfiguration: AccessoryConfiguration;
  readonly log: VirtualLogger;

  readonly accessoryId: string;
  readonly accessoryName: string;
  readonly accessoryTypeName: string;
  readonly accessoryIsStateful: boolean;

  protected defaultState;

  protected storagePath: string;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: S,
    accessoryTypeName: string,
  ) {
    this.accessory = accessory;
    this.platform = platform;

    // The accessory configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.accessoryConfiguration = accessoryConfiguration;
    this.accessoryId = this.accessoryConfiguration.accessoryID;
    this.accessoryName = this.accessoryConfiguration.accessoryName;
    this.accessoryIsStateful = this.accessoryConfiguration.accessoryIsStateful;
    this.accessoryTypeName = accessoryTypeName;
    this.log = this.platform.log;

    this.log.debug(`[${this.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.storagePath = accessory.context.storagePath;

    if (!this.accessoryIsStateful) {
      this.deleteAccessoryState(this.storagePath);
    }

    const args = [this.accessory.displayName] as unknown as ConstructorArgs<S>;
    //    this.service = this.getPrimaryService(this.accessory) || this.accessory.addService(serviceType, ...args);


    const primaryService = this.getPrimaryService(this.accessory);
    if (primaryService !== undefined) {
      console.info(`Found primary service: ${primaryService}`);
      this.service = primaryService;
    }
    else {
      console.info(`No primary service found. Adding service ${serviceType}`);
      this.service = this.accessory.addService(serviceType, ...args);
      console.info('Added');
    }


    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryName);

    // set accessory information
    this.accessoryInformationService = this.accessory.getService(this.platform.Service.AccessoryInformation) || this.accessory.addService(this.platform.Service.AccessoryInformation);
    this.accessoryInformationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, `Virtual Accessory - ${accessoryTypeName}`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID)
      .setCharacteristic(this.platform.Characteristic.Name, this.accessoryName)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.accessory.context.firmwareVersion);
  }

  isExternalAccessory(): boolean {
    return [Categories.SPEAKER, Categories.TELEVISION].includes(this.accessory.category);
  }

  updateConfiguredName(): void {
    const configuredName = this.accessoryInformationService!.getCharacteristic(this.platform.Characteristic.ConfiguredName);
    if (configuredName !== undefined) {
      this.accessoryInformationService!.removeCharacteristic(configuredName);
    }
  }

  getAccessoryTypeName(): string {
    return this.accessoryTypeName;
  };

  private readonly EMPTY_ACCESSORY_STATE = '{}';

  private getPrimaryService(accessory: PlatformAccessory): Service | undefined {
    let primaryService: Service | undefined;

    console.info(`Accessory ${accessory.displayName} -> Category ${accessory.UUID}`);
    console.info(`Found service count: ${accessory.services.length}`);
    for (const service of accessory.services) {
      console.info(`Accessory ${accessory.displayName} -> Service: ${service.name}/${service.name}`);
      if (service.isPrimaryService) {
        //return service;
        primaryService = service;
      }
    }

    console.info(`Returning primary Service: ${primaryService?.getServiceId()}`);
    return primaryService;
  }

  // Accessory State

  protected isEmptyAccessoryState(
    json: any,
  ): boolean {
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
  ): void {
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
  protected storeState(): void {
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }
  }

  protected abstract getJsonState(): string;
}
