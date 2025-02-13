/* eslint-disable curly */

/**
 * 
 */
export class DoorbellConfiguration {
  volume!: number;

  static prefix: string = 'doorbell';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDoorbellVolume: boolean = (
      (this.volume !== undefined) &&
      (this.volume >= 0 && this.volume <= 100)
    );

    // Store fields failing validation
    if (!isValidDoorbellVolume) this.errorFields.push(DoorbellConfiguration.prefix + '.doorbellVolume');

    return [
      (isValidDoorbellVolume),
      this.errorFields,
    ];
  }
}
