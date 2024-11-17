import { Trigger } from './trigger.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { PingTriggerConfiguration } from '../configuration/configurationPingTrigger.js';

// import dns from 'dns';
import net from 'net';
import ping from 'net-ping';

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
    sensor: VirtualSensor,
    name: string,
  ) {
    super(sensor, name);

    const triggerConfig: PingTriggerConfiguration = this.sensorConfig.pingTrigger;

    this.log.info(`[${this.sensorConfig.accessoryName}] PingTriggerConfig ${JSON.stringify(triggerConfig)}`);

    if (triggerConfig.isDisabled) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Ping trigger is disabled`);
      return;
    }

    const ipProtocolVersion = net.isIP(triggerConfig.host);
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
    // case this.NOT_IP:
    //   // TODO: this is a domain name, perform DNS lookup
    //   protocol = ping.NetworkProtocol.None;  // 0
    //   break;
    default:
      this.log.error(`[${this.sensorConfig.accessoryName}] Unkown or invalid IP protocol version: ${ipProtocolVersion}`);
      return;
    }
    this.log.debug(`[${this.sensorConfig.accessoryName}] Protocol: ${ping.NetworkProtocol[protocol]}`);

    const pingTimeoutMillis = 10 * 1000;    // trigger.pingTimeout: 10 seconds
    const intervalBetweenPingsMillis = 60 * 1000;   // trigger.intervalBetweenPings: 60 seconds

    setInterval(
      this.ping, intervalBetweenPingsMillis,
      this,
      triggerConfig,
      protocol,
      pingTimeoutMillis);
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

    const sensorConfig: AccessoryConfiguration = trigger.sensor.accessoryConfiguration;

    const session = ping.createSession(options);

    session.pingHost(triggerConfig.host, (error, target: string, sent: number, rcvd: number) => {
      const millis = rcvd - sent;
      if (error) {
        trigger.log.error(`[${sensorConfig.accessoryName}] Ping ${target}: ${error.toString()}`);

        if (trigger.failureCount.value < Number.MAX_VALUE) {
          trigger.failureCount.value++;
        }

        trigger.log.info(`[${sensorConfig.accessoryName}] Failure count: ${trigger.failureCount.value}`);
        if (trigger.failureCount.value === triggerConfig.failureRetryCount) {
          trigger.log.debug(`[${sensorConfig.accessoryName}] Reached failure retry count of ${triggerConfig.failureRetryCount}. Triggering sensor`);

          trigger.sensor.triggerKeySensorState(trigger.sensor.OPEN_TRIGGERED, trigger);
        }
      } else {
        trigger.log.debug(`[${sensorConfig.accessoryName}] Ping ${target}: Alive (latency: ${millis}ms)`);

        trigger.failureCount.value = 0;
        trigger.sensor.triggerKeySensorState(trigger.sensor.CLOSED_NORMAL, trigger);
      }

      session.close ();
    });
  }

  // private async getIP(hostname: string) {
  //   const response = await dns.promises.lookup(hostname)
  //     .then((result: dns.LookupAddress) => {
  //       this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] IP address retrieved for '${hostname}' is '${result.address}'`);
  //     })
  //     .catch((error: Error) => {
  //       this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] Error retrieving IP address for '${hostname}': ${error.message}`);
  //     })
  //
  //   return response?.address;
  // }
}

export const dynamicTrigger = PingTrigger;
