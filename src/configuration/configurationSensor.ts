/* eslint-disable curly */

import { Validatable } from './validatable.js';
import { SensorType, TriggerType } from './schema.js';

import { Utils } from '../utils/utils.js';

/**
 * 
 */
export class SensorConfiguration implements Validatable {
  type!: string;
  trigger!: string;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidType: boolean = (
      Utils.required(this.type) &&
      SensorType.Types.includes(this.type)
    );

    const isValidTrigger: boolean = (
      Utils.required(this.trigger) &&
      TriggerType.Types.includes(this.trigger)
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidTrigger) this.errorFields.push(prefix + '.' + this.fieldNames.trigger);

    return [
      (isValidType &&
        isValidTrigger),
      this.errorFields,
    ];
  }
}
