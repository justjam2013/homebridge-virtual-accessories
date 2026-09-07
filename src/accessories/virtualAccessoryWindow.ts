import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PositionAccessory } from './positionAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';

/**
 * Window - Accessory implementation
 */
export class Window extends PositionAccessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.Window;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getOpenableAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.window;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return Window.ACCESSORY_SERVICE_TYPE;
  }
}
