/* eslint-disable curly */

import { Validatable } from './validatable.js';
import { MeasurementSensorType } from './schema.js';

import { Utils } from '../utils/utils.js';

import { Name } from 'typeserializer';

/**
 * 
 */
export class MeasurementSensorConfiguration implements Validatable {
  type!: string;

  @Name('temperatureUnits')
    units: string = '';

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidType: boolean = (
      Utils.required(this.type) &&
      MeasurementSensorType.Types.includes(this.type)
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);

    return [
      (isValidType),
      this.errorFields,
    ];
  }
}
