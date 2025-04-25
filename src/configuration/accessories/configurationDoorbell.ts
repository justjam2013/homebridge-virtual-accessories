/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class DoorbellConfiguration {
  volume!: number;

  static prefix: string = 'doorbell';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidVolume: boolean = Utils.isPercentage(this.volume);

    // Store fields failing validation
    if (!isValidVolume) this.errorFields.push(DoorbellConfiguration.prefix + '.volume');

    return [
      (isValidVolume),
      this.errorFields,
    ];
  }
}
