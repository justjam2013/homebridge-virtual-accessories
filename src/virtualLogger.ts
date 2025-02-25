/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logging, LogLevel } from 'homebridge';

export class VirtualAccessoriesLogger {

  private platformLogger: Logging;

  private muteInfo: boolean = false;

  constructor(
    platformLogger: Logging,
  );
  constructor(
    platformLogger: Logging,
    muteInfo?: boolean,
  ) {
    this.platformLogger = platformLogger;

    if (muteInfo !== undefined) {
      this.muteInfo = muteInfo;
    }
  }

  info (message: string, debug: boolean = false, parameters: any[] = []): void {
    if (debug || this.muteInfo) {
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
