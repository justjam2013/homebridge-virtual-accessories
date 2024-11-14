import { Logging } from 'homebridge';

import { Trigger, TriggerConfig } from './trigger.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';

// import dns from 'dns';
import net from 'net';
import ping from 'net-ping';

/**
 *  Private wrapper class to pass failureCount by reference
 */
class Counter {

  value: number = 0;

  constructor(
    value: number,
  ) {
    this.value = value;
  }
}

/**
 * PingTriggerConfig - Trigger Configuration implementation
 */
export class PingTriggerConfig extends TriggerConfig {
  host!: string;
  failureRetryCount!: number;
  isDisabled: boolean = false;
}

/**
 * PingTrigger - Trigger implementation
 */
export class PingTrigger extends Trigger {

  static TriggerConfigName: string = 'pingTrigger';

  private NOT_IP: number = 0;
  private IPv4: number = 4;
  private IPv6: number = 6;

  private failureCount = new Counter(0);

  private done: boolean = false;

  constructor(
    sensor: VirtualSensor,
  ) {
    super(sensor, PingTrigger.TriggerConfigName, PingTriggerConfig);

    const trigger: PingTriggerConfig = <PingTriggerConfig>this.config;

    this.log.info(`[${this.sensorConfig.accessoryName}] PingTriggerConfig ${JSON.stringify(trigger)}`);

    if (trigger.isDisabled) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Ping trigger is disabled`);
      return;
    }

    const ipProtocolVersion = net.isIP(trigger.host);
    // TODO: DNS lookup
    // if (ipVersion === this.NOT_IP) {
    //   const ip = this.getIP(trigger.host);
    //   ipVersion = net.isIP(ip);
    // }

    let protocol: string;
    switch(ipProtocolVersion) {
    case this.IPv4:
      protocol = ping.NetworkProtocol.IPv4;
      break;
    case this.IPv6:
      protocol = ping.NetworkProtocol.IPv6;
      break;
    default:
      this.log.error(`[${this.sensorConfig.accessoryName}] Unkown or invalid IP protocol version: ${ipProtocolVersion}`);
      return;
    }
    this.log.debug(`[${this.sensorConfig.accessoryName}] Protocol: ${ping.NetworkProtocol[protocol]}`);

    const pingTimeoutMillis = 20 * 1000;    // trigger.pingTimeout: 20 seconds
    const intervalBetweenPingsMillis = 30 * 1000;   // trigger.intervalBetweenPings: 60 seconds

    setInterval(
      this.ping, intervalBetweenPingsMillis,
      this.sensor,
      this.log,
      protocol,
      trigger.host,
      pingTimeoutMillis,
      trigger.failureRetryCount,
      this.failureCount);
  }

  /**
   * Protected methods
   */

  protected getConfigClass(): typeof TriggerConfig {
    return PingTriggerConfig;
  }

  /**
   * Private methods
   */

  private ping(
    sensor: VirtualSensor,
    log: Logging,
    protocol: string,
    ipAddress: string,
    pingTimeoutMillis: number,
    failureRetryCount: number,
    failureCount: Counter,
  ) {
    const options = {
      networkProtocol: protocol,
      packetSize: 16,
      retries: 1,
      sessionId: (process.pid % 65535),
      timeout: pingTimeoutMillis,
      ttl: 128,
    };

    const sensorConfig = sensor.accessory.context.deviceConfiguration;

    const session = ping.createSession(options);
    session.pingHost(ipAddress, (error, target: string, sent: number, rcvd: number) => {
      const millis = rcvd - sent;
      if (error) {
        log.error(`[${sensorConfig.accessoryName}] Ping ${target}: ${error.toString()}`);

        if (failureCount.value < Number.MAX_VALUE) {
          failureCount.value++;
        }

        log.info(`[${sensorConfig.accessoryName}] Failure count: ${failureCount.value}`);
        if (failureCount.value === failureRetryCount) {
          log.debug(`[${sensorConfig.accessoryName}] Reached failure retry count of ${failureRetryCount}. Triggering sensor`);

          sensor.setSensorState(sensor.OPEN_TRIGGERED);
        }
      } else {
        log.debug(`[${sensorConfig.accessoryName}] Ping ${target}: Alive (ms=${millis})`);

        failureCount.value = 0;
        sensor.setSensorState(sensor.CLOSED_NORMAL);
      }

      session.close ();
    });
  }

  // private async getIP(hostname: string) {
  //   const obj = await dns.promises.lookup(hostname)
  //     .then((result: dns.LookupAddress) => {
  //       this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] IP address retrieved for '${hostname}' is '${result.address}'`);
  //     })
  //     .catch((error: Error) => {
  //       this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] Error retrieving IP address for '${hostname}': ${error.message}`);
  //     })
  //     .finally(() => {
  //       this.done = true;
  //     });

  //   return obj?.address;
  // }
}

export const dynamicTrigger = PingTrigger;
