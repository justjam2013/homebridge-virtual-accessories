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

  static prefix: string = 'lightbulb';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      ['on', 'off'].includes(this.defaultState)
    );

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
    if (!isValidDefaultState) this.errorFields.push(LightbulbConfiguration.prefix + '.defaultState');
    if (!isValidType) this.errorFields.push(LightbulbConfiguration.prefix + '.type');
    if (!isValidBrightness) this.errorFields.push(LightbulbConfiguration.prefix + '.brightness');
    if (!isValidColorTemperature) this.errorFields.push(LightbulbConfiguration.prefix + '.colorTemperature');

    return [
      (isValidDefaultState &&
        isValidType &&
        isValidBrightness &&
        isValidColorTemperature),
      this.errorFields,
    ];
  }
}
