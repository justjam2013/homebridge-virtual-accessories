import { Validatable } from './validatable.js';

import { Utils } from '../utils/utils.js';

/**
 * 
 */
export class WebhookServerConfiguration implements Validatable {
  enabled: boolean = false;
  port: string = '60221';
  useHttps: boolean = false;
  domain!: string;

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

    let isValidDomain: boolean = true;
    if (this.useHttps) {
      isValidDomain = (this.domain !== undefined) ? true : false;
    }

    return [
      (isValidPort &&
        isValidDomain),
      this.errorFields,
    ];
  }
}
