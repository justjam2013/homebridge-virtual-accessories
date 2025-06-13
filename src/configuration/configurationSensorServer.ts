import { AccessoryConfiguration } from './configurationAccessory.js';

import { Utils } from '../utils.js';

/**
 * 
 */
export class SensorServerConfiguration extends AccessoryConfiguration {
  enabled: boolean = false;
  port: string = '60221';

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
