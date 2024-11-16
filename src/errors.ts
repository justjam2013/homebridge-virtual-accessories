/**
 * Custom errors
 */

export class NotCompanionError extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class AccessoryNotAllowedError extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class TriggerNotAllowedError extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}
