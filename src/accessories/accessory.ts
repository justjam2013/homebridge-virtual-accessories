 
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Categories, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

import { VirtualLogger } from '../utils/virtualLogger.js';
import { CharacteristicUtils } from '../characteristicsUtils.js';

import fs from 'fs';

/**
 * Abstract Accessory
 */
export abstract class Accessory extends CharacteristicUtils {
  //service!: Service;

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
    super();

    this.accessory = accessory;
    this.platform = platform;

    // The accessory configuration is stored in the context in VirtualAccessoryPlatform.discoverDevices()
    this.accessoryConfiguration = accessoryConfiguration;
    this.accessoryName = this.accessoryConfiguration.accessoryName;
    this.log = this.platform.log;

    this.log.debug(`[${this.accessoryName}] Accessory context: ${JSON.stringify(accessory.context)}`);

    this.storagePath = accessory.context.storagePath;

    if (!this.accessoryConfiguration.accessoryIsStateful) {
      this.deleteState(this.storagePath);
    }

    const accessoryService: WithUUID<typeof Service> = this.getAccessoryService();

    // Set accessory information
    this.accessoryInformationService = this.accessory.getService(ServiceType.AccessoryInformation);
    this.accessoryInformationService!
      .setCharacteristic(CharacteristicType.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(CharacteristicType.Model, `Virtual Accessory - ${this.getServiceTypeName(accessoryService)}`)
      .setCharacteristic(CharacteristicType.SerialNumber, this.accessory.UUID)
      .setCharacteristic(CharacteristicType.Name, this.accessoryName)
      .setCharacteristic(CharacteristicType.FirmwareRevision, this.accessory.context.firmwareVersion);

    // Set accessory service info
    this.service = this.accessory.getService(accessoryService) || this.accessory.addService(accessoryService as unknown as Service);
    this.updateName(this.accessoryName);
  }

  isExternalAccessory(): boolean {
    return [Categories.SPEAKER, Categories.TELEVISION].includes(this.accessory.category);
  }

  updateInformationServiceConfiguredName() {
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

  protected deleteState(
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
  protected saveState() {
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }
  }

  private getServiceTypeName(serviceType: WithUUID<typeof Service>): string {
    let accessoryTypeName: string;

    switch(serviceType) {
    case ServiceType.AirPurifier: { accessoryTypeName = 'AirPurifier'; break; }
    case ServiceType.Battery: { accessoryTypeName = 'Battery'; break; }
    case ServiceType.Door: { accessoryTypeName = 'Door'; break; }
    case ServiceType.Doorbell: { accessoryTypeName = 'Doorbell'; break; }
    case ServiceType.Fan: { accessoryTypeName = 'Fan'; break; }
    case ServiceType.FilterMaintenance: { accessoryTypeName = 'Filter'; break; }
    case ServiceType.GarageDoorOpener: { accessoryTypeName = 'GarageDoor'; break; }
    case ServiceType.HeaterCooler: { accessoryTypeName = 'HeaterCooler'; break; }
    case ServiceType.HumidifierDehumidifier: { accessoryTypeName = 'HumidifierDehumidifier'; break; }
    case ServiceType.InputSource: { accessoryTypeName = 'InputSource'; break; }
    case ServiceType.Lightbulb: { accessoryTypeName = 'Lightbulb'; break; }
    case ServiceType.LockMechanism: { accessoryTypeName = 'Lock'; break; }
    case ServiceType.Microphone: { accessoryTypeName = 'Microphone'; break; }
    case ServiceType.SecuritySystem: { accessoryTypeName = 'SecuritySystem'; break; }
    case ServiceType.SmartSpeaker: { accessoryTypeName = 'SmartSpeaker'; break; }
    case ServiceType.Speaker: { accessoryTypeName = 'Speaker'; break; }
    case ServiceType.Switch: { accessoryTypeName = 'Switch'; break; }
    case ServiceType.Television: { accessoryTypeName = 'Television'; break; }
    case ServiceType.Valve: { accessoryTypeName = 'Valve'; break; }
    case ServiceType.Window: { accessoryTypeName = 'Window'; break; }
    case ServiceType.WindowCovering: { accessoryTypeName = 'WindowCovering'; break; }
    default: { accessoryTypeName = 'unknown'; }
    }

    return accessoryTypeName;
  }

  // Absract methods

  protected abstract getAccessoryService(): WithUUID<typeof Service>;

  protected abstract getJsonState(): string;
}
