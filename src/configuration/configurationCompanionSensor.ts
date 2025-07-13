/* eslint-disable curly */

import { Validatable } from './validatable.js';
import { DurationConfiguration } from './configurationDuration.js';

import { Utils } from '../utils/utils.js';

import { Type } from 'typeserializer';

/**
 * 
 */
export class CompanionSensorConfiguration implements Validatable {
  name!: string;
  type!: string;
  @Type(DurationConfiguration)
    delay?: DurationConfiguration;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidName: boolean = (
      Utils.required(this.name)
    );

    const isValidType: boolean = (
      Utils.required(this.type)
    );

    let isValidDelay: boolean = true;
    let delayErrorFields: string[] = [];
    if (this.delay !== undefined) {
      [isValidDelay, delayErrorFields] = this.delay.isValid(this.fieldNames.delay!);
    }

    if (!isValidName) this.errorFields.push(prefix + '.' + this.fieldNames.name);
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidDelay) {
      delayErrorFields.forEach( (errorField) => {
        this.errorFields.push(prefix + '.' + errorField);
      });
    }

    return [
      (isValidName &&
        isValidType &&
        isValidDelay),
      this.errorFields,
    ];
  }
}
