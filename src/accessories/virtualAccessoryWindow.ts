import type { PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { OpeningAccessory } from './openingAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Window - Accessory implementation
 */
export class Window extends OpeningAccessory<typeof Service.Window> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Window';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Window,
      Window.ACCESSORY_TYPE_NAME,
    );
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.window;
  }
}
