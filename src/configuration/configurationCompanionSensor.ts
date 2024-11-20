/* eslint-disable curly */

/**
 * 
 */
export class CompanionSensorConfiguration {
  name!: string;
  type!: string;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidName: boolean = (this.name !== undefined);
    const isValidType: boolean = (this.type !== undefined);

    if (!isValidName) this.errorFields.push('name');
    if (!isValidType) this.errorFields.push('type');

    return [
      (isValidName &&
        isValidType),
      this.errorFields,
    ];
  }
}
