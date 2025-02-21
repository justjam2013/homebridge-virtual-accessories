/* eslint-disable curly */

/**
 * 
 */
export class WindowCoveringConfiguration {
  defaultState!: string;
  transitionDuration!: number;

  static prefix: string = 'windowCovering';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'closed', 'open' ].includes(this.defaultState)
    );

    const isValidTransitionDuration: boolean = (
      this.transitionDuration === undefined?
        true :
        (0 <= this.transitionDuration)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(WindowCoveringConfiguration.prefix + '.defaultState');
    if (!isValidTransitionDuration) this.errorFields.push(WindowCoveringConfiguration.prefix + '.transitionDuration');

    return [
      (isValidDefaultState &&
        isValidTransitionDuration),
      this.errorFields,
    ];
  }
}
