import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { OpeningAccessory } from './openingAccessory.js';
import { OpeningAccessoryConfiguration } from '../configuration/configurationOpeningAccesory.js';

/**
 * Window - Accessory implementation
 */
export class Window extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getOpeningAccessoryConfiguration(): OpeningAccessoryConfiguration {
    return this.accessoryConfiguration.window;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.Window;
  }

  protected getAccessoryTypeName(): string {
    return Window.ACCESSORY_TYPE_NAME;
  }
}
