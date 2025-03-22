/* eslint-disable curly */

/**
 * 
 */
export class SpeakerConfiguration {
  volume!: number;
  mute!: boolean;

  static prefix: string = 'speaker';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidVolume: boolean = (
      (this.volume !== undefined) &&
      (this.volume >= 0 && this.volume <= 100)
    );

    // Store fields failing validation
    if (!isValidVolume) this.errorFields.push(SpeakerConfiguration.prefix + '.volume');

    return [
      (isValidVolume),
      this.errorFields,
    ];
  }
}
