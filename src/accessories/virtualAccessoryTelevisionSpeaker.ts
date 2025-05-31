import type { PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AudioAccessory } from './audioAccessory.js';
import { AudioAccessoryConfiguration } from '../configuration/configurationAudioAccessoryConfiguration.js';

/**
 * TelevisionSpeaker - Accessory implementation
 */
export class TelevisionSpeaker extends AudioAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'TelevisionSpeaker';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
  }

  protected getAudioAccessoryConfiguration(): AudioAccessoryConfiguration {
    return this.accessoryConfiguration.television.speaker;
  }

  protected getAudioAccessoryService(): WithUUID<typeof Service> {
    this.log.info(`Returning Service.TelevisionSpeaker: ${this.platform.Service.TelevisionSpeaker.name}`);
    return this.platform.Service.TelevisionSpeaker;
  }

  protected getAccessoryTypeName(): string {
    return TelevisionSpeaker.ACCESSORY_TYPE_NAME;
  }
}
