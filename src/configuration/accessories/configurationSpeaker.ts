/* eslint-disable curly */

import { AudioAccessoryConfiguration } from '../configurationAudioAccessoryConfiguration.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class SpeakerConfiguration extends AudioAccessoryConfiguration {
  // volume!: number;
  // mute!: boolean;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidVolume: boolean = (
      Utils.required(this.volume) &&
      Utils.isPercentage(this.volume)
    );

    // Store fields failing validation
    if (!isValidVolume) this.errorFields.push(prefix + '.' + this.fieldNames.volume);

    return [
      (isValidVolume),
      this.errorFields,
    ];
  }
}
