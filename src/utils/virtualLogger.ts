/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logging, LogLevel } from 'homebridge';

/**
 * VirtualLogLevel
 */
export declare const enum VirtualLogLevel {
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
}

/**
 * VirtualLogger
 */
export class VirtualLogger {

  private platformLogger: Logging;

  private logLevel: VirtualLogLevel;

  constructor(
    platformLogger: Logging,
    logLevel: VirtualLogLevel = VirtualLogLevel.INFO,
  ) {
    this.platformLogger = platformLogger;

    this.logLevel = logLevel;
  }

  setLogLevel(logLevel: VirtualLogLevel): void {
    this.logLevel = logLevel;
  }

  getLogLevel(): VirtualLogLevel {
    return this.logLevel;
  }

  debug(message: string, parameters: any[] = []): void {
    if (this.logLevel <= VirtualLogLevel.DEBUG) {
      this.platformLogger.debug(message, ...parameters);
    }
  }

  info (message: string, debug: boolean = false, parameters: any[] = []): void {
    if (debug) {
      this.platformLogger.debug(message, ...parameters);
    } else {
      this.platformLogger.info(message, ...parameters);
    }
  }

  warn(message: string, parameters: any[] = []): void {
    if (this.logLevel <= VirtualLogLevel.WARNING) {
      this.platformLogger.warn(message, ...parameters);
    }
  }

  error(message: string, parameters: any[] = []): void {
    if (this.logLevel <= VirtualLogLevel.ERROR) {
      this.platformLogger.error(message, ...parameters);
    }
  }

  log(logLevel: VirtualLogLevel, message: string, parameters: any[] = []): void {
    let level: LogLevel;

    switch (logLevel) {
    case VirtualLogLevel.DEBUG:
      level = LogLevel.DEBUG;
      break;
    case VirtualLogLevel.INFO:
      level = LogLevel.INFO;
      break;
    case VirtualLogLevel.WARNING:
      level = LogLevel.WARN;
      break;
    case VirtualLogLevel.ERROR:
      level = LogLevel.ERROR;
      break;
    }

    this.platformLogger.log(level, message, ...parameters);
  }
}
