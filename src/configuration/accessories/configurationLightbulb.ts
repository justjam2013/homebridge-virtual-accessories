/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { ColorTemperature, LightbulbType, PowerState } from '../schema.js';

import { Utils } from '../../utils/utils.js';
import { Colors } from '../../utils/colorUtils.js';

/**
 * 
 */
export class LightbulbConfiguration implements Validatable {
  defaultState!: string;
  type!: string;
  brightness!: number;
  colorTemperatureKelvin!: number;
  colorHex!: string;

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
      ([LightbulbType.White, LightbulbType.Ambiance].includes(this.type)) ?
        (
          Utils.required(this.brightness) &&
          Utils.isPercentage(this.brightness)
        ) :
        true
    );

    const isValidColorTemperature: boolean = (
      (this.type === LightbulbType.Ambiance) ?
        (
          Utils.required(this.colorTemperatureKelvin) &&
          (this.colorTemperatureKelvin >= ColorTemperature.TemperatureKelvinMin && this.colorTemperatureKelvin <= ColorTemperature.TemperatureKelvinMax)
        ) :
        true
    );

    const isValidColorRGB: boolean = (
      (this.type === LightbulbType.Color) ?
        (
          Utils.required(this.colorHex) &&
          Colors.isValidHex(this.colorHex)
        ) :
        true
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidBrightness) this.errorFields.push(prefix + '.' + this.fieldNames.brightness);
    if (!isValidColorTemperature) this.errorFields.push(prefix + '.' + this.fieldNames.colorTemperatureKelvin);
    if (!isValidColorRGB) this.errorFields.push(prefix + '.' + this.fieldNames.colorHex);

    return [
      (isValidDefaultState &&
        isValidType &&
        isValidBrightness &&
        isValidColorTemperature &&
        isValidColorRGB),
      this.errorFields,
    ];
  }
}
