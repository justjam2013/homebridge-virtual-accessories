/* eslint-disable curly */

import { Type } from 'typeserializer';
import { InputSourceConfiguration } from './configurationInputSource.js';
import { TelevisionSpeakerConfiguration } from './configurationTelevisionSpeaker.js';

/**
 * 
 */
export class TelevisionConfiguration {
  inputs!: string[];
  hasAudio: boolean = false;

  @Type(TelevisionSpeakerConfiguration)
    speaker!: TelevisionSpeakerConfiguration;

  static prefix: string = 'television';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const speakerFieldName: string = 'speaker';

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

    let isValidTelevisionSpeaker: boolean = true;
    let televisionSpeakerErrorFields: string[] = [];
    if (this.hasAudio === true) {
      if (this.speaker !== undefined) {
        [isValidTelevisionSpeaker, televisionSpeakerErrorFields] = this.speaker.isValid();
      } else {
        [isValidTelevisionSpeaker, televisionSpeakerErrorFields] = [false, [ speakerFieldName ]];
      }
    }

    // Store fields failing validation
    if (!isValidInputsArray) this.errorFields.push(TelevisionConfiguration.prefix + '.inputs');
    if (!isValidInputNames) this.errorFields.push(TelevisionConfiguration.prefix + '.inputs');

    if (!isValidTelevisionSpeaker) {
      televisionSpeakerErrorFields.forEach( (errorField) => {
        this.errorFields.push(TelevisionConfiguration.prefix + '.' + errorField);
      });
    }

    return [
      (isValidInputsArray &&
        isValidInputNames &&
        isValidTelevisionSpeaker),
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
