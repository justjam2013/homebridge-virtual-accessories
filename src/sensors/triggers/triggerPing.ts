import { PingTriggerConfiguration } from '../../configuration/triggers/configurationPingTrigger.js';
import { Trigger } from './trigger.js';
import { BinarySensor } from '../binarySensor.js';

import { shutdownSignal } from '../../utils/utils.js';

import dns, { LookupOneOptions } from 'dns';
import ipaddr from 'ipaddr.js';
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

  private readonly LAN_ms_latency_threshold: number = 30;
  private readonly NET_ms_latency_threshold: number = 100;

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

    this.log.info(`[${this.accessoryName}] Pinging ${triggerConfig.host}`);
    // One ping only Vasily
    await this.ping(this, triggerConfig);

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
        trigger.failureCount.value = 0;
        trigger.sensor.triggerSensorState(BinarySensor.NORMAL, trigger);

        trigger.handleLatency(trigger, IP, result.latency);
      }
      else {
        // Only log the error when we reach the failure count instead of spamming the logs
        trigger.log.debug(`[${trigger.accessoryName}] Ping ${IP}: ${result.message}`);

        trigger.handlePingFailure(trigger, triggerConfig, IP, result.message);
      }
    }
    catch (error) {
      trigger.log.debug(`Error attempting to ping ${IP}: ${error}`);

      let message: string;
      if (error instanceof Error) {
        message = error.message;
      }
      else {
        message = String(error);
      }
      trigger.handlePingFailure(trigger, triggerConfig, IP, message);
    }
  }

  private handlePingFailure(
    trigger: PingTrigger,
    triggerConfig: PingTriggerConfiguration,
    IP: string,
    message: string,
  ) {
    if (trigger.failureCount.value < Number.MAX_VALUE) {
      trigger.failureCount.value++;
    }

    trigger.log.debug(`[${trigger.accessoryName}] Failure count: ${trigger.failureCount.value}`);
    if (trigger.failureCount.value === triggerConfig.failureRetryCount) {
      trigger.log.debug(`[${trigger.accessoryName}] Reached failure retry count of ${triggerConfig.failureRetryCount}. Triggering sensor`);

      // Only log the error when we reach the failure count instead of spamming the logs
      trigger.log.error(`[${trigger.accessoryName}] Ping ${IP}: ${message}`);

      trigger.sensor.triggerSensorState(BinarySensor.TRIGGERED, trigger);
    }
  }

  private handleLatency(
    trigger: PingTrigger,
    IP: string,
    latency: number | null,
  ) {
    if (latency === null) {
      trigger.log.warn(`[${trigger.accessoryName}] Ping ${IP}: Alive (latency: unknown)`);
    }
    else {
      const latencyDisplay = Math.round(latency * 10) / 10;
      const threshold: number = this.isLocalIP(IP) ? this.LAN_ms_latency_threshold : this.NET_ms_latency_threshold;

      // Ping times over 30ms–60ms within the same LAN are considered high and indicate a configuration or hardware bottleneck.
      if (latency > threshold) {
        trigger.log.warn(`[${trigger.accessoryName}] Ping ${IP}: Alive (latency: ${latencyDisplay.toFixed(1)} ms)`);
      }
      else {
        trigger.log.debug(`[${trigger.accessoryName}] Ping ${IP}: Alive (latency: ${latencyDisplay.toFixed(1)} ms)`);
      }
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

  private isLocalIP(IP: string): boolean {
    if (net.isIPv4(IP)) {
      const address: ipaddr.IPv4 = ipaddr.parse(IP) as ipaddr.IPv4;

      return ['private', 'linkLocal', 'loopback'].includes(address.range());
    }
    else if (net.isIPv6(IP)) {
      const address: ipaddr.IPv6 = ipaddr.parse(IP) as ipaddr.IPv6;

      return ['uniqueLocal', 'linkLocal', 'loopback'].includes(address.range());
    }

    return false;
  }
}

interface PingResult {
  success: boolean;
  latency: number | null;
  message: string;
}

export const dynamicTrigger = PingTrigger;
