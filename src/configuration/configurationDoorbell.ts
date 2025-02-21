/* eslint-disable curly */

/**
 * 
 */
export class DoorbellConfiguration {
  volume!: number;

  static prefix: string = 'doorbell';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidVolume: boolean = (
      (this.volume !== undefined) &&
      (this.volume >= 0 && this.volume <= 100)
    );

    // Store fields failing validation
    if (!isValidVolume) this.errorFields.push(DoorbellConfiguration.prefix + '.volume');

    return [
      (isValidVolume),
      this.errorFields,
    ];
  }
}
