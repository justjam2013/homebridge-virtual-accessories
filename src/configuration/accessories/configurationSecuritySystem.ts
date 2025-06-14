/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { SecuritySystemState } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class SecuritySystemConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  armedModes!: string[];

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      SecuritySystemState.States.includes(this.defaultState) &&
      this.armedModesContainsDefaultState()
    );

    const isValidArmedModes: boolean = (
      Utils.notEmpty(this.armedModes)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidArmedModes) this.errorFields.push(prefix + '.' + this.fieldNames.armedModes);

    return [
      (isValidDefaultState &&
        isValidArmedModes),
      this.errorFields,
    ];
  }

  // TODO: remove this method once ng-formworks feature 'Feature request: Implement multi select using oneOf as set of checkboxes'
  // (https://github.com/zahmo/ng-formworks/issues/26) is complete

  /**
   * This method is necessary becasue the values for
   * states are: 'disarmed', 'armedaway', 'armednight', 'armedstay'
   * while values for
   * armed modes are: 'Away', 'Night', 'Stay'
   */
  private armedModesContainsDefaultState(): boolean {
    let armedModesContainsDefaultState: boolean = false;
    if ((this.defaultState === SecuritySystemState.ArmedAway && this.armedModes.includes('Away')) ||
        (this.defaultState === SecuritySystemState.ArmedNight && this.armedModes.includes('Night')) ||
        (this.defaultState === SecuritySystemState.ArmedStay && this.armedModes.includes('Stay'))
    ) {
      armedModesContainsDefaultState = true;
    }

    return armedModesContainsDefaultState;
  }
}
