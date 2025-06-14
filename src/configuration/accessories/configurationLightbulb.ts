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
  hue!: number;
  saturation!: number;

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

    const isValidHue: boolean = (
      (this.type === LightbulbType.Color) ?
        (
          Utils.required(this.hue) &&
          Utils.isDegrees(this.hue)
        ) :
        true
    );

    const isValidSaturation: boolean = (
      (this.type === LightbulbType.Color) ?
        (
          Utils.required(this.saturation) &&
          Utils.isPercentage(this.saturation)
        ) :
        true
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidBrightness) this.errorFields.push(prefix + '.' + this.fieldNames.brightness);
    if (!isValidColorTemperature) this.errorFields.push(prefix + '.' + this.fieldNames.colorTemperatureKelvin);
    if (!isValidHue) this.errorFields.push(prefix + '.' + this.fieldNames.hue);
    if (!isValidSaturation) this.errorFields.push(prefix + '.' + this.fieldNames.saturation);

    return [
      (isValidDefaultState &&
        isValidType &&
        isValidBrightness &&
        isValidColorTemperature &&
        isValidHue &&
        isValidSaturation),
      this.errorFields,
    ];
  }
}
