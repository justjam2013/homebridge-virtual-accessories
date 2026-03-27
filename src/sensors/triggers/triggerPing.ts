/* eslint-disable brace-style */

import { PingTriggerConfiguration } from '../../configuration/triggers/configurationPingTrigger.js';
import { Trigger } from './trigger.js';
import { BinarySensor } from '../binarySensor.js';

import { shutdownSignal } from '../../utils/utils.js';

import dns from 'dns';
import net from 'net';
import ping from '@justjam2013/net-ping';

/**
 *  Private helper classes to pass values by reference
 */
class Counter {

  value: number;

  constructor(
    value: number,
  ) {
    this.value = value;
  }
}

/**
 * PingTrigger - Trigger implementation
 */
export class PingTrigger extends Trigger {

  private NOT_IP: number = 0;
  private IPv4: number = 4;
  private IPv6: number = 6;

  private failureCount = new Counter(0);

  constructor(
    sensor: BinarySensor,
    name: string,
  ) {
    super(sensor, name);

    const triggerConfig: PingTriggerConfiguration = this.sensorConfig.pingTrigger;

    if (triggerConfig.isDisabled) {
      this.log.info(`[${this.accessoryName}] Ping trigger is disabled`);
      return;
    }

    this.setup(triggerConfig);
  }

  private async setup(triggerConfig: PingTriggerConfiguration) {

    let ipProtocolVersion = net.isIP(triggerConfig.host);
    if (ipProtocolVersion === this.NOT_IP) {
      const ip: string | void = await this.getIP(triggerConfig.host);
      if (ip) {
        ipProtocolVersion = net.isIP(ip);
        triggerConfig.host = ip;
      }
    }

    let protocol: string;
    switch(ipProtocolVersion) {
    case this.IPv4:
      protocol = ping.NetworkProtocol.IPv4;
      break;
    case this.IPv6:
      protocol = ping.NetworkProtocol.IPv6;
      break;
    default:
      this.log.error(`[${this.accessoryName}] Unkown or invalid IP protocol version: ${ipProtocolVersion}`);
      return;
    }
    this.log.debug(`[${this.accessoryName}] Protocol: ${ping.NetworkProtocol[protocol]}`);

    const pingTimeoutMillis = 10 * 1000;            // trigger.pingTimeout: 10 seconds
    const intervalBetweenPingsMillis = 60 * 1000;   // trigger.intervalBetweenPings: 60 seconds

    setInterval(
      this.ping, intervalBetweenPingsMillis,
      this,
      triggerConfig,
      protocol,
      pingTimeoutMillis,
    )
      .unref();
  }

  /**
   * Private methods
   */

  private async ping(
    trigger: PingTrigger,
    triggerConfig: PingTriggerConfiguration,
    protocol: string,
    pingTimeoutMillis: number,
  ) {
    if (shutdownSignal.isShuttingDown) {return;}

    // If protocol === None, do a DNS lookup
    // const host = await getIP(hostname: string);
    // protocol = ping.NetworkProtocol.IPv4;
    // Create a helper class for protocol, so the value can be updated

    const options = {
      networkProtocol: protocol,
      packetSize: 16,
      retries: 3,
      sessionId: (process.pid % 65535),
      timeout: pingTimeoutMillis,
      ttl: 128,
    };

    const session = ping.createSession(options);

    session.pingHost(triggerConfig.host, (error, target: string, sent: number, rcvd: number) => {
      const millis = rcvd - sent;
      if (error) {
        // Only log the error when we reach the failure count instead of spamming the logs
        trigger.log.debug(`[${trigger.accessoryName}] Ping ${target}: ${error.toString()}`);

        if (trigger.failureCount.value < Number.MAX_VALUE) {
          trigger.failureCount.value++;
        }

        trigger.log.debug(`[${trigger.accessoryName}] Failure count: ${trigger.failureCount.value}`);
        if (trigger.failureCount.value === triggerConfig.failureRetryCount) {
          trigger.log.debug(`[${trigger.accessoryName}] Reached failure retry count of ${triggerConfig.failureRetryCount}. Triggering sensor`);

          // Only log the error when we reach the failure count instead of spamming the logs
          trigger.log.error(`[${trigger.accessoryName}] Ping ${target}: ${error.toString()}`);

          trigger.sensor.triggerSensorState(BinarySensor.TRIGGERED, trigger);
        }
      }
      else {
        trigger.log.debug(`[${trigger.accessoryName}] Ping ${target}: Alive (latency: ${millis}ms)`);

        trigger.failureCount.value = 0;
        trigger.sensor.triggerSensorState(BinarySensor.NORMAL, trigger);
      }

      session.close ();
    });
  }

  private async getIP(hostname: string): Promise<string | void> {
    const response = await dns.promises.lookup(hostname)
      .then((result: dns.LookupAddress) => {
        this.sensor.platform.log.info(`[${this.accessoryName}] IP address retrieved for '${hostname}' is '${result.address}'`);
        return result.address;
      })
      .catch((error: Error) => {
        this.sensor.platform.log.error(`[${this.accessoryName}] Error retrieving IP address for '${hostname}': ${error.message}`);
      });
  
    return response;
  }
}

export const dynamicTrigger = PingTrigger;
