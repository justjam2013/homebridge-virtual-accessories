import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { OpeningAccessory } from './openingAccessory.js';
import { OpeningAccessoryConfiguration } from '../configuration/configurationOpeningAccesory.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window Covering';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getOpeningAccessoryConfiguration(): OpeningAccessoryConfiguration {
    return this.accessoryConfiguration.windowCovering;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.WindowCovering;
  }

  protected getAccessoryTypeName(): string {
    return WindowCovering.ACCESSORY_TYPE_NAME;
  }
}
