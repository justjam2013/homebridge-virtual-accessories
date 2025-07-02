/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { SecuritySystemArmedMode, SecuritySystemState } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class SecuritySystemConfiguration implements Validatable {
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
   * armed modes are: 'Away', 'Night', 'Home'
   */
  private armedModesContainsDefaultState(): boolean {
    let armedModesContainsDefaultState: boolean = false;
    if ((this.defaultState === SecuritySystemState.ArmedAway && this.armedModes.includes(SecuritySystemArmedMode.ArmedAway)) ||
        (this.defaultState === SecuritySystemState.ArmedNight && this.armedModes.includes(SecuritySystemArmedMode.ArmedNight)) ||
        (this.defaultState === SecuritySystemState.ArmedStay && this.armedModes.includes(SecuritySystemArmedMode.ArmedStay)) ||
        (this.defaultState === SecuritySystemState.Disarmed)
    ) {
      armedModesContainsDefaultState = true;
    }

    return armedModesContainsDefaultState;
  }
}
