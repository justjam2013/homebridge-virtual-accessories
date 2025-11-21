import { Validatable } from './validatable.js';

import { Utils } from '../utils/utils.js';

/**
 * 
 */
export class WebhookServerConfiguration implements Validatable {
  enabled: boolean = false;
  port: string = '60221';
  useQueryParameters: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    if (!this.enabled) {
      return [ true, this.errorFields ];
    }

    const isValidPort: boolean = (
      Utils.required(this.port) &&
      !isNaN(Number(this.port))
    );

    if (!isValidPort) {
      this.errorFields.push(prefix + '.' + this.fieldNames.port);
    }

    return [
      (isValidPort),
      this.errorFields,
    ];
  }
}
