/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { ColorTemperature, LightbulbType, PowerState } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class LightbulbConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  type!: string;
  brightness!: number;
  colorTemperatureKelvin!: number;
  // TODO:
  // hue!: number;
  // saturation!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      PowerState.States.includes(this.defaultState)
    );

    const isValidType: boolean = (
      Utils.required(this.type) &&
      LightbulbType.Types.includes(this.type)
    );

    const isValidBrightness: boolean = (
      Utils.required(this.brightness) &&
      Utils.isPercentage(this.brightness)
    );

    const isValidColorTemperature: boolean = (
      (this.type === LightbulbType.Ambiance) ?
        (
          Utils.required(this.colorTemperatureKelvin) &&
          (this.colorTemperatureKelvin >= ColorTemperature.TemperatureKelvinMin && this.colorTemperatureKelvin <= ColorTemperature.TemperatureKelvinMax)
        ) :
        true
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidBrightness) this.errorFields.push(prefix + '.' + this.fieldNames.brightness);
    if (!isValidColorTemperature) this.errorFields.push(prefix + '.' + this.fieldNames.colorTemperatureKelvin);

    return [
      (isValidDefaultState &&
        isValidType &&
        isValidBrightness &&
        isValidColorTemperature),
      this.errorFields,
    ];
  }
}
