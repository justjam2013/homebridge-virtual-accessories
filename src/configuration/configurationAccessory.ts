/**
 * 
 */
export abstract class AccessoryConfiguration {

  abstract isValid(prefix: string): [boolean, string[]];
}
