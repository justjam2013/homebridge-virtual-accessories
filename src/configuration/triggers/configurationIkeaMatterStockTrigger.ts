/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class IkeaMatterStockTriggerConfiguration implements Validatable {
  country!: string;
  storeLocation!: string;
  itemName!: string;
  isDisabled: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidCountry: boolean = (
      Utils.required(this.country)
    );

    const isValidStoreLocation: boolean = (
      Utils.required(this.storeLocation)
    );

    const isValidItemName: boolean = (
      Utils.required(this.itemName)
    );

    if (!isValidCountry) this.errorFields.push(prefix + '.' + this.fieldNames.country!);
    if (!isValidStoreLocation) this.errorFields.push(prefix + '.' + this.fieldNames.storeLocation!);
    if (!isValidItemName) this.errorFields.push(prefix + '.' + this.fieldNames.itemName!);

    return [
      (isValidCountry &&
        isValidStoreLocation &&
        isValidItemName),
      this.errorFields,
    ];
  }
}
