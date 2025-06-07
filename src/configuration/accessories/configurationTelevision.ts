/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { InputSourceConfiguration } from './configurationInputSource.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class TelevisionConfiguration extends AccessoryConfiguration {
  inputs!: string[];

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidInputsArray: boolean = (
      Utils.required(this.inputs) &&
      (this.inputs.length > 0)
    );

    let isValidInputNames: boolean = true;
    const namesSet: Set<string> = new Set();
    this.inputs.forEach(input => {
      isValidInputNames &&=
        input.length > 0 &&
        !namesSet.has(input);

      namesSet.add(input);
    });

    // Store fields failing validation
    if (!isValidInputsArray) this.errorFields.push(prefix + '.' + this.fieldNames.inputs);
    if (!isValidInputNames) this.errorFields.push(prefix + '.' + this.fieldNames.inputs);

    return [
      (isValidInputsArray &&
        isValidInputNames),
      this.errorFields,
    ];
  }

  getInputSources(): InputSourceConfiguration[] {
    const HDMI = 3;   // Characteristic.InputSourceType.HDMI

    const inputSources: InputSourceConfiguration[] = [];
    this.inputs.forEach((name, index) => {
      const inputSource = new InputSourceConfiguration();
      inputSource.name = name;
      inputSource.inputSourceType = HDMI;
      inputSource.identifier = index;

      inputSources.push(inputSource);
    });

    return inputSources;
  }
}
