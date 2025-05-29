/* eslint-disable curly */

import { Type } from 'typeserializer';
import { InputSourceConfiguration } from './configurationInputSource.js';
import { SpeakerConfiguration } from './configurationSpeaker.js';

/**
 * 
 */
export class TelevisionConfiguration {
  inputs!: string[];
  hasAudio: boolean = false;

  @Type(SpeakerConfiguration)
    speaker!: SpeakerConfiguration;

  static prefix: string = 'television';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidInputsArray: boolean = (
      (this.inputs !== undefined) &&
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
    if (!isValidInputsArray) this.errorFields.push(TelevisionConfiguration.prefix + '.inputs');
    if (!isValidInputNames) this.errorFields.push(TelevisionConfiguration.prefix + '.inputs');

    return [
      (isValidInputsArray &&
        isValidInputNames),
      this.errorFields,
    ];
  }

  getInputSources(): InputSourceConfiguration[] {
    const HDMI = 3;   // Characteristic.InputSourceType.HDMI

    const inputSources: InputSourceConfiguration[] = [];
    this.inputs.forEach(name => {
      const inputSource = new InputSourceConfiguration();
      inputSource.name = name;
      inputSource.inputSourceType = HDMI;
      inputSources.push(inputSource);
    });

    return inputSources;
  }
}
