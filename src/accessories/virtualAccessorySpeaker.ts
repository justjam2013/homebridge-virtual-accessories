import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AudioAccessory } from './audioAccessory.js';
import { AudioAccessoryConfiguration } from '../configuration/configurationAudioAccessoryConfiguration.js';

/**
 * Speaker - Accessory implementation
 */
export class Speaker extends AudioAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Speaker';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getAudioAccessoryConfiguration(): AudioAccessoryConfiguration {
    return this.accessoryConfiguration.speaker;
  }

  protected getAudioAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.Speaker;
  }

  protected getAccessoryTypeName(): string {
    return Speaker.ACCESSORY_TYPE_NAME;
  }
}
