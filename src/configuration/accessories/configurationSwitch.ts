/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class SwitchConfiguration {
  defaultState!: string;
  hasResetTimer: boolean = false;
  hasCompanionSensor: boolean = false;
  muteLogging: boolean = false;

  static prefix: string = 'switch';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidDefaultState: boolean = Utils.isPoweredState(this.defaultState);

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(SwitchConfiguration.prefix + '.defaultState');

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
