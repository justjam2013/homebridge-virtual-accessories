import { PingTriggerConfiguration } from '../../configuration/triggers/configurationPingTrigger.js';
import { Trigger } from './trigger.js';
import { BinarySensor } from '../binarySensor.js';

import { shutdownSignal } from '../../utils/utils.js';

import dns, { LookupOneOptions } from 'dns';
import net from 'net';
import { ping } from '@homebridge/node-icmp-ping';

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

  private readonly NOT_IP: number = 0;
  private readonly IPv4: number = 4;
  private readonly IPv6: number = 6;

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

    let ipProtocolVersion: number = net.isIP(triggerConfig.host);
    if (ipProtocolVersion === this.NOT_IP) {
      // This might be a hostname, so try to resolve it to an IPv4
      // might change this later to be either IPv4 or IPv6
      const ip: string | void = await this.getIP(triggerConfig.host);
      if (ip) {
        ipProtocolVersion = net.isIP(ip);
        triggerConfig.host = ip;
      }
      else {
        this.log.error(`[${this.accessoryName}] No valid IP found for: ${triggerConfig.host}`);
        return;
      }
    }

    const intervalBetweenPingsMillis = triggerConfig.interval * 60 * 1000;  // minutes to milliseconds
    this.log.info(`[${this.accessoryName}] Setting interval between pings to ${intervalBetweenPingsMillis/1000/60} minute(s)`);

    setInterval(
      // function, repeat interval
      this.ping, intervalBetweenPingsMillis,
      // function params
      this,
      triggerConfig,
    )
      .unref();
  }

  /**
   * Private methods
   */

  private async ping(
    trigger: PingTrigger,
    triggerConfig: PingTriggerConfiguration,
  ) {
    if (shutdownSignal.isShuttingDown) {return;}

    const IP: string = triggerConfig.host;

    // If protocol === None, do a DNS lookup
    // const IP = await this.getIP(triggerConfig.host, this.IPv4);
    // protocol = ping.NetworkProtocol.IPv4;

    try {
      const result: PingResult = await ping(IP);

      if (result.success) {
        trigger.log.debug(`[${trigger.accessoryName}] Ping ${IP}: Alive (latency: ${result.latency}ms)`);

        trigger.failureCount.value = 0;
        trigger.sensor.triggerSensorState(BinarySensor.NORMAL, trigger);
      }
      else {
        // Only log the error when we reach the failure count instead of spamming the logs
        trigger.log.debug(`[${trigger.accessoryName}] Ping ${IP}: ${result.message}`);

        if (trigger.failureCount.value < Number.MAX_VALUE) {
          trigger.failureCount.value++;
        }

        trigger.log.debug(`[${trigger.accessoryName}] Failure count: ${trigger.failureCount.value}`);
        if (trigger.failureCount.value === triggerConfig.failureRetryCount) {
          trigger.log.debug(`[${trigger.accessoryName}] Reached failure retry count of ${triggerConfig.failureRetryCount}. Triggering sensor`);

          // Only log the error when we reach the failure count instead of spamming the logs
          trigger.log.error(`[${trigger.accessoryName}] Ping ${IP}: ${result.message}`);

          trigger.sensor.triggerSensorState(BinarySensor.TRIGGERED, trigger);
        }
      }
    }
    catch (error) {
      trigger.log.error(`Error attempting to ping ${IP}: ${error}`);
    }
  }

  private async getIP(hostname: string): Promise<string | void> {
    const options: LookupOneOptions = {
      hints: dns.ADDRCONFIG | dns.V4MAPPED,
      order: 'ipv4first',
    };
    const response: string | void = await dns.promises.lookup(hostname, options)
      .then((result: dns.LookupAddress) => {
        const address: string = result.address;
        this.sensor.platform.log.info(`[${this.accessoryName}] IP address retrieved for '${hostname}' is '${address}'`);
        return address;
      })
      .catch((error: Error) => {
        this.sensor.platform.log.error(`[${this.accessoryName}] Error retrieving IP address for '${hostname}': ${error.message}`);
      });
  
    return response;
  }
}

interface PingResult {
  success: boolean;
  latency: number | null;
  message: string;
}

export const dynamicTrigger = PingTrigger;
