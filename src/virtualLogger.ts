/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logging, LogLevel } from 'homebridge';

export class VirtualLogger {

  private platformLogger: Logging;

  constructor(
    platformLogger: Logging,
  ) {
    this.platformLogger = platformLogger;
  }

  info (message: string, debug: boolean = false, parameters: any[] = []): void {
    if (debug) {
      this.platformLogger.debug(message, ...parameters);
    } else {
      this.platformLogger.info(message, ...parameters);
    }
  }

  success(message: string, parameters: any[] = []): void {
    this.platformLogger.success(message, ...parameters);
  }

  warn(message: string, parameters: any[] = []): void {
    this.platformLogger.warn(message, ...parameters);
  }

  error(message: string, parameters: any[] = []): void {
    this.platformLogger.error(message, ...parameters);
  }

  debug(message: string, parameters: any[] = []): void {
    this.platformLogger.debug(message, ...parameters);
  }

  log(level: LogLevel, message: string, parameters: any[] = []): void {
    this.platformLogger.log(level, message, ...parameters);
  }

}
