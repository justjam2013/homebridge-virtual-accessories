import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { OpeningAccessory } from './openingAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window Covering';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.windowCovering;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.WindowCovering;
  }

  protected getAccessoryTypeName(): string {
    return WindowCovering.ACCESSORY_TYPE_NAME;
  }
}
