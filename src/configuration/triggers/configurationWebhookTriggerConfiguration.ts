 

import { Utils } from '../../utils.js';

/**
 * 
 */
export class WebhookTriggerConfiguration {
  isDisabled: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isValid(prefix: string): [boolean, string[]] {
    return [
      (true),
      this.errorFields,
    ];
  }
}
