/* eslint-disable curly */

/**
 * 
 */
export class LightbulbConfiguration {
  defaultState!: string;
  type!: string;
  brightness!: number;
  colorTemperatureKelvin!: number;
  // TODO:
  // hue!: number;
  // saturation!: number;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (this.defaultState !== undefined);

    const isValidType: boolean = (
      (this.type !== undefined) &&
      ['white', 'ambiance', 'color'].includes(this.type)
    );

    const isValidBrightness: boolean = (
      (this.brightness !== undefined) &&
      (this.brightness >= 0 && this.brightness <= 100)
    );

    const isValidColorTemperature: boolean = (
      this.colorTemperatureKelvin === undefined?
        true :
        (2203 <= this.colorTemperatureKelvin && this.colorTemperatureKelvin <= 6536)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push('lightbulb.defaultState');
    if (!isValidType) this.errorFields.push('lightbulb.type');
    if (!isValidBrightness) this.errorFields.push('lightbulb.brightness');
    if (!isValidColorTemperature) this.errorFields.push('lightbulb.colorTemperature');

    return [
      (isValidDefaultState &&
        isValidType &&
        isValidBrightness &&
        isValidColorTemperature),
      this.errorFields,
    ];
  }
}
