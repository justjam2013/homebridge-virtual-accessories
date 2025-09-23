import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class WebhookTriggerConfiguration implements Validatable {
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
