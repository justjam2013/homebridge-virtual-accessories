/* eslint-disable curly */
 

/**
 * 
 */
export class HumidifierDehumidifierConfiguration {
  type!: string;
  humidifierThreshold: number = 0;
  dehumidifierThreshold: number = 0;

  static prefix: string = 'humidifierDehumidifier';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      [ 'auto', 'humidifier', 'dehumidifier' ].includes(this.type)
    );

    const isValidHumidifierThreshold: boolean = (
      (this.humidifierThreshold !== undefined) &&
      (this.humidifierThreshold >= 0 && this.humidifierThreshold <= 100)
    );

    const isValidDehumidifierThreshold: boolean = (
      (this.dehumidifierThreshold !== undefined) &&
      (this.dehumidifierThreshold >= 0 && this.dehumidifierThreshold <= 100)
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.type');
    if (!isValidHumidifierThreshold) this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.humidifierThreshold');
    if (!isValidDehumidifierThreshold) this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.dehumidifierThreshold');

    return [
      (isValidType &&
        isValidHumidifierThreshold &&
        isValidDehumidifierThreshold),
      this.errorFields,
    ];
  }
}
