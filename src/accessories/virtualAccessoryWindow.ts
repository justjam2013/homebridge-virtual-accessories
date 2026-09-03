import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Window - Accessory implementation
 */
export class Window extends PositionAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.window;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.Window;
  }

  protected getAccessoryTypeName(): string {
    return Window.ACCESSORY_TYPE_NAME;
  }
}
