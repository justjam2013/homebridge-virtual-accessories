/* eslint-disable curly */

/**
 * 
 */
export class ValveConfiguration {
  type!: string;
  duration!: number;

  static prefix: string = 'valve';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      [ 'generic', 'irrigation', 'showerhead', 'waterfaucet' ].includes(this.type)
    );

    const isValidDuration: boolean = (
      this.duration === undefined?
        true :
        (0 <= this.duration && this.duration <= 3600)
    );


    // Store fields failing validation
    if (!isValidType) this.errorFields.push(ValveConfiguration.prefix + '.type');
    if (!isValidDuration) this.errorFields.push(ValveConfiguration.prefix + '.duration');

    return [
      (isValidType &&
        isValidDuration),
      this.errorFields,
    ];
  }
}
