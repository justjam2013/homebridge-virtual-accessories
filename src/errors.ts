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

export class SensorValueUpdateNotAllowed extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class InvalidSensorValue extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class InvalidSensorValueType extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class ObstructionValueUpdateNotAllowed extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class InvalidObstructionValueType extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class ChargingStateUpdateNotAllowed extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}

export class InvalidChargingStateType extends Error {

  constructor(
    message: string,
  ) {
    super();
    this.message = message;
  }
}
