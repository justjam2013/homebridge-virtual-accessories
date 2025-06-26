/* eslint-disable brace-style */
 

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { DurationConfiguration } from '../configurationDuration.js';

import { Utils } from '../../utils.js';

import { Type } from 'typeserializer';

/**
 * 
 */
export class FilterMaintenanceConfiguration extends AccessoryConfiguration {
  @Type(DurationConfiguration)
    lifespan!: DurationConfiguration;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    let isValidLifespan: boolean = true;
    let lifespanErrorFields: string[] = [];
    if (this.lifespan !== undefined) {
      [isValidLifespan, lifespanErrorFields] = this.lifespan.isValid(this.fieldNames.lifespan!);
    } 
    else {
      [isValidLifespan, lifespanErrorFields] = [false, [ this.fieldNames.lifespan! ]];
    }

    // Store fields failing validation
    if (!isValidLifespan) {
      lifespanErrorFields.forEach( (errorField) => {
        this.errorFields.push(prefix + '.' + errorField);
      });
    }

    return [
      (isValidLifespan),
      this.errorFields,
    ];
  }
}
