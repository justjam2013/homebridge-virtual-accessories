// import * as dns from 'dns';
import net from 'net';
import ping from 'net-ping';

import { Trigger } from './trigger.js';
import { VirtualSensor } from './virtualSensor.js';

let failures: number = 0;

export class PingTrigger extends Trigger {

  private NOT_IP: number = 0;
  private IPv4: number = 4;
  private IPv6: number = 6;

  private sensor: VirtualSensor;
  private sensorConfig;

  private done: boolean = false;

  constructor(
    sensor: VirtualSensor,
  ) {
    super();

    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessory.context.deviceConfiguration;

    const trigger = this.sensorConfig.pingTrigger;
    if (trigger.isDisabled) {
      this.sensor.platform.log.info(`[${this.sensorConfig.accessoryName}] Ping trigger is disabled`);
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
      this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] Unkown or invalid IP protocol version: ${ipProtocolVersion}`);
      return;
    }
    this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Protocol: ${ping.NetworkProtocol[protocol]}`);

    const pingTimeoutMillis = 20 * 1000;    // trigger.pingTimeout: 20 seconds
    const intervalBetweenPingsMillis = 30 * 1000;   // trigger.intervalBetweenPings: 60 seconds

    setInterval(this.ping, intervalBetweenPingsMillis, this.sensor, protocol, trigger.host, pingTimeoutMillis, trigger.failureRetryCount);
  }

  private ping(
    sensor: VirtualSensor,
    protocol: string,
    ipAddress: string,
    pingTimeoutMillis: number,
    failureRetryCount: number,
  ) {
    const options = {
      networkProtocol: protocol,
      packetSize: 16,
      retries: 1,
      sessionId: (process.pid % 65535),
      timeout: pingTimeoutMillis,
      ttl: 128,
    };

    const log = sensor.platform.log;
    const sensorConfig = sensor.accessory.context.deviceConfiguration;

    const session = ping.createSession(options);
    session.pingHost(ipAddress, (error, target: string, sent: number, rcvd: number) => {
      const millis = rcvd - sent;
      if (error) {
        log.error(`[${sensorConfig.accessoryName}] Ping ${target}: ${error.toString()}`);

        if (failures < Number.MAX_VALUE) {
          failures++;
        }

        log.info(`[${sensorConfig.accessoryName}] Failure count: ${failures}`);
        if (failures === failureRetryCount) {
          log.debug(`[${sensorConfig.accessoryName}] Reached failure retry count of ${failureRetryCount}. Triggering sensor`);

          sensor.setSensorState(sensor.OPEN_TRIGGERED);
        }
      } else {
        log.debug(`[${sensorConfig.accessoryName}] Ping ${target}: Alive (ms=${millis})`);

        failures = 0;
        sensor.setSensorState(sensor.CLOSED_NORMAL);
      }
    });
    //session.close ();
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
