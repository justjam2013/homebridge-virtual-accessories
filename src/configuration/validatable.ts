/**
 * 
 */
export interface Validatable {

  isValid(prefix: string): [boolean, string[]];
}
