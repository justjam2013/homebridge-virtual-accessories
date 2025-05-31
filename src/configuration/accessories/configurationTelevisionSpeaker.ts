/* eslint-disable curly */

import { Utils } from '../../utils.js';
import { AudioAccessoryConfiguration } from '../configurationAudioAccessoryConfiguration.js';

/**
 * 
 */
export class TelevisionSpeakerConfiguration extends AudioAccessoryConfiguration {
  // volume!: number;
  // mute!: boolean;

  static prefix: string = 'speaker';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidVolume: boolean = Utils.isPercentage(this.volume);

    // Store fields failing validation
    if (!isValidVolume) this.errorFields.push(TelevisionSpeakerConfiguration.prefix + '.volume');

    return [
      (isValidVolume),
      this.errorFields,
    ];
  }
}
