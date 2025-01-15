/* eslint-disable curly */

/**
 * 
 */
export class LightbulbConfiguration {
  defaultState!: string;
  type!: string;
  brightness!: number;
  // TODO:
  // colorTemperature!: number;
  // hue!: number;
  // saturation!: number;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (this.defaultState !== undefined);

    const isValidType: boolean = (
      (this.type !== undefined) &&
      ['white', 'ambient', 'color'].includes(this.type)
    );

    const isValidBrightness: boolean = (
      (this.brightness !== undefined) &&
      (this.brightness >= 0 && this.brightness <= 100)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push('lightbulb.defaultState');
    if (!isValidBrightness) this.errorFields.push('lightbulb.brightness');

    return [
      (isValidDefaultState &&
        isValidType &&
        isValidBrightness),
      this.errorFields,
    ];
  }
}