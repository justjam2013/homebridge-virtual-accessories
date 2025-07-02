import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { OpeningAccessory } from './openingAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Door - Accessory implementation
 */
export class Door extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Door';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.door;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.Door;
  }

  protected getAccessoryTypeName(): string {
    return Door.ACCESSORY_TYPE_NAME;
  }
}
