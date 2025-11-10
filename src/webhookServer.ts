/* eslint-disable brace-style */

import { Server } from 'http';
import { Accessory } from './accessories/accessory.js';
import { SecurityServiceTriggerType } from './accessories/virtualAccessorySecuritySystem.js';
import { Sensor } from './sensors/sensor.js';
import { Trigger } from './sensors/triggers/trigger.js';
import { VirtualLogger } from './utils/virtualLogger.js';

import { TriggerableAlarm } from './accessories/triggerableAlarm.js';
import { TriggerableSensor } from './sensors/triggerableSensor.js';
import { UpdatableChargingState } from './accessories/updatableChargingState.js';
import { UpdatableObstruction } from './accessories/updatableObstruction.js';
import { UpdatableSensor } from './sensors/updatableSensor.js';

import { Certificate, createCA, createCert } from './utils/mkcertUtils.js';

import { SensorValueUpdateNotAllowed } from './errors.js';

import express, { Express, NextFunction, Request, Response } from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs-extra';

/**
 * WebhookServer
 */
export class WebhookServer {

  private static accessoryIdPattern: string = '^[A-Za-z0-9\\-]{5,}$';

  private readonly accessories: Map<string, Accessory> = new Map<string, Accessory>();
  private readonly log: VirtualLogger;

  private readonly serverName: string = 'Sensor Server';

  private server: Express = express();
  private httpXServer: http.Server | https.Server;
  private webhookServer?: Server;
  private port: number;
  private useHttps: boolean;
  private domains: string[] = [];

  constructor(
    log: VirtualLogger,
    port: number,
    useHttps: boolean,
    domains: string[],
    certificatePath: string,
  );
  constructor(
    log: VirtualLogger,
    port: number,
    useHttps: boolean,
    domains: string[],
    certificatePath: string,
    accessories?: Accessory[],
  ) {
    this.log = log;
    this.port = port;
    this.useHttps = useHttps;
    this.domains = (domains === undefined) ? [] : domains;

    // parse application/x-www-form-urlencoded
    this.server.use(express.urlencoded({ extended: true }));

    // parse application/json
    this.server.use(express.json());

    if (accessories) {
      this.addAccessories(accessories);
    }

    // Routes

    const routeHumidity: string = '/humidity';
    this.log.info(`[${this.serverName}] Setting up route: ${routeHumidity}`);
    this.server.post(routeHumidity, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const humidity: string = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.percentageIsValid(humidity, response)) {
        this.processRequest(accessoryId, 'humidifierdehumidifier', Number(humidity), response);
      }
    });

    const routeTemperature: string = '/temperature';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTemperature}`);
    this.server.post(routeTemperature, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const temperature: string = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.numberIsValid(temperature, response)) {
        this.processRequest(accessoryId, 'heatercooler', Number(temperature), response);
      }
    });

    const routeObstruction: string = '/obstruction';
    this.log.info(`[${this.serverName}] Setting up route: ${routeObstruction}`);
    this.server.post(routeObstruction, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const obstruction: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.booleanIsValid(obstruction, response)) {
        this.processRequest(accessoryId, 'garagedoor', obstruction, response);
      }
    });

    const routeTriggerAlarm: string = '/triggeralarm';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerAlarm}`);
    this.server.post(routeTriggerAlarm, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const trigger: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.booleanIsValid(trigger, response)) {
        this.processRequest(accessoryId, 'securitysystem', trigger ? SecurityServiceTriggerType.TriggerAlarm : SecurityServiceTriggerType.None, response);
      }
    });

    const routeTriggerPanic: string = '/triggerpanic';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerPanic}`);
    this.server.post(routeTriggerPanic, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const trigger: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.booleanIsValid(trigger, response)) {
        this.processRequest(accessoryId, 'securitysystem', trigger ? SecurityServiceTriggerType.TriggerPanic : SecurityServiceTriggerType.None, response);
      }
    });

    const routeTriggerSensor: string = '/triggersensor';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerSensor}`);
    this.server.post(routeTriggerSensor, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const trigger: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.booleanIsValid(trigger, response)) {
        this.processRequest(accessoryId, 'sensor', trigger, response);
      }
    });

    const routeChargingState: string = '/chargingstate';
    this.log.info(`[${this.serverName}] Setting up route: ${routeChargingState}`);
    this.server.post(routeChargingState, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const charging: boolean = request.body.charging;
      const charge: number = request.body.charge;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      const chargingState: ChargingState = new ChargingState(charging, charge);
      if (this.accessoryIdIsValid(accessoryId, response) && this.chargingStateIsValid(chargingState, response)) {
        this.processRequest(accessoryId, 'battery', chargingState, response);
      }
    });

    // Setup http/https
    const certificate: Certificate | undefined =
      this.useHttps ?
        new ServerCertificate(this.log, this.serverName, certificatePath)
          .getCertificate(this.domains) :
        undefined;

    if (certificate === undefined) {
      this.log.info(`[${this.serverName}] No certificates found, running in insecure mode (HTTP)`);

      this.httpXServer = http.createServer(this.server);
    }
    else {
      this.log.info(`[${this.serverName}] Found certificates, running in secure mode (HTTPS)`);

      this.server.enable('trust proxy');
      this.server.use(this.requireHTTPS);

      const credentials = {
        key: certificate.key,
        cert: certificate.cert,
      };
      this.httpXServer = https.createServer(credentials, this.server);
    }
  }

  start() {
    this.log.info(`[${this.serverName}] Starting Sensor Server`);
    this.webhookServer = this.httpXServer.listen(this.port, () => {
      // eslint-disable-next-line max-len
      this.log.info(`[${this.serverName}] Sensor Server running as "${(this.httpXServer instanceof http.Server) ? 'http' : ''}${(this.httpXServer instanceof https.Server ? 'https' : '')}" for domain "${this.domains.join(',')}" on port ${this.port}`);
    });
  }

  stop() {
    this.log.info(`[${this.serverName}] Stopping Sensor Server`);
    this.webhookServer?.close(() => {
      this.log.info(`[${this.serverName}] Sensor Server terminated`);
    });
  }

  addAccessories(
    accessories: Accessory[],
  ) {
    accessories.forEach((accessory) => {
      this.addAccessory(accessory);
    });
  }

  addAccessory(
    accessory: Accessory,
  ) {
    let addedAccessory: boolean = false;

    if (
      (<TriggerableAlarm><unknown>accessory).triggerAlarm !== undefined ||
      (<TriggerableSensor><unknown>accessory).triggerSensor !== undefined ||
      (<UpdatableChargingState><unknown>accessory).updateChargingState !== undefined ||
      (<UpdatableObstruction><unknown>accessory).updateObstruction !== undefined ||
      (<UpdatableSensor><unknown>accessory).updateSensor !== undefined
    ) {
      this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
      addedAccessory = true;
    }
    else if (accessory instanceof Sensor) {
      const trigger: Trigger = (<Sensor><unknown>accessory).getTrigger();
      if ((<TriggerableSensor><unknown>trigger).triggerSensor !== undefined) {
        this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
        addedAccessory = true;
      }
    }

    if (addedAccessory === true) {
      this.log.info(`[${this.serverName}] Added accessory ${accessory.accessoryConfiguration.accessoryName} (${accessory.accessoryConfiguration.accessoryID})`);
    }
    else {
      // eslint-disable-next-line max-len
      this.log.debug(`[${this.serverName}] Skipping accessory ${accessory.accessoryConfiguration.accessoryName} (${accessory.accessoryConfiguration.accessoryID})`);
    }
  }

  removeAccessory(
    accessory: Accessory,
  ): boolean {
    const found: boolean = this.accessories.delete(accessory.accessoryConfiguration.accessoryID);
    this.log.info(`[${this.serverName}] Removed accessory ${accessory.accessoryConfiguration.accessoryName} (${accessory.accessoryConfiguration.accessoryID})`);

    return found;
  }

  getAccessories(): Accessory[] {
    const accessories: Accessory[] = [...this.accessories.values()];
    return accessories;
  }

  private requireHTTPS(req: Request, res: Response, next: NextFunction) {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      next();
    } else {
      res.redirect('https://' + req.headers.host + req.url);
    }
  }

  private accessoryIdIsValid(
    accessoryId: string,
    response: Response,
  ): boolean {
    const patternRegex: RegExp = new RegExp(WebhookServer.accessoryIdPattern);
    const isValidAccessoryId: boolean = (
      (accessoryId !== undefined) &&
      patternRegex.test(accessoryId)
    );

    if (!isValidAccessoryId) {
      const errorMsg: string = `Invalid accessory id: ${accessoryId}`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private percentageIsValid(
    value: string,
    response: Response,
  ): boolean {
    const valuePercent: number = Number(value);

    if (isNaN(valuePercent) || valuePercent < 0 || valuePercent > 100) {
      const errorMsg: string = `Invalid value: ${value}. Value must be a percentage`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private numberIsValid(
    value: string,
    response: Response,
  ): boolean {
    const valueNumber: number = Number(value);

    if (isNaN(valueNumber)) {
      const errorMsg: string = `Invalid value: ${value}. Value must be a number`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private booleanIsValid(
    value: boolean,
    response: Response,
  ): boolean {
    if (typeof value !== 'boolean') {
      const errorMsg: string = `Invalid value: ${value}. Value must be a boolean`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private chargingStateIsValid(
    chargingState: ChargingState,
    response: Response,
  ): boolean {
    if (chargingState.isEmpty()) {
      const errorMsg: string = 'No values provided for chargeable, charging, or charge';
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    const charging: boolean = chargingState.charging;
    const charge: number = chargingState.charge;

    if ((charging !== undefined) && typeof charging !== 'boolean') {
      const errorMsg: string = `Invalid charging value: ${charging}. Value must be a boolean`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }
    if ((charge !== undefined) && (isNaN(charge) || charge < 0 || charge > 100)) {
      const errorMsg: string = `Invalid charge value: ${charge}. Value must be a percentage`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private processRequest(
    accessoryId: string,
    accessoryType: string,
    value: number | boolean | ChargingState,
    response: Response,
  ) {
    const accessory: Accessory | undefined = this.accessories.get(accessoryId);

    if (accessory !== undefined && accessory.accessoryConfiguration.accessoryType === accessoryType) {
      try {
        if ((<TriggerableAlarm><unknown>accessory).triggerAlarm !== undefined) {
          (<TriggerableAlarm><unknown>accessory).triggerAlarm(<number>value, accessoryId);
        }
        else if ((<TriggerableSensor><unknown>accessory).triggerSensor !== undefined) {
          (<TriggerableSensor><unknown>accessory).triggerSensor(<boolean>value, accessoryId);
        }
        else if ((<UpdatableChargingState><unknown>accessory).updateChargingState !== undefined) {
          const chargingState: ChargingState = (<ChargingState>value);
          (<UpdatableChargingState><unknown>accessory).updateChargingState(chargingState.charging, chargingState.charge, accessoryId);
        }
        else if ((<UpdatableObstruction><unknown>accessory).updateObstruction !== undefined) {
          (<UpdatableObstruction><unknown>accessory).updateObstruction(<boolean>value, accessoryId);
        }
        else if ((<UpdatableSensor><unknown>accessory).updateSensor !== undefined) {
          (<UpdatableSensor><unknown>accessory).updateSensor(<number>value, accessoryId);
        }
        else if (accessory instanceof Sensor) {
          const trigger: Trigger = (<Sensor><unknown>accessory).getTrigger();
          if ((<TriggerableSensor><unknown>trigger).triggerSensor !== undefined) {
            (<TriggerableSensor><unknown>trigger).triggerSensor(<boolean>value, accessoryId);
          }
        }

        const msgValue: string = 
          (typeof value === 'number' || typeof value === 'boolean') ?
            value.toString() :
            JSON.stringify(value);
        const message: string = `Set accessory with id: ${accessoryId} to value: ${msgValue}`;
        this.log.info(`[${this.serverName}] ${message}`);
        response.status(HttpResponse.Ok).send(`${message}`);
      }
      catch (error) {
        let errorMsg: string = error as string;
        if (error instanceof SensorValueUpdateNotAllowed) {
          errorMsg = error.message;
        }

        this.log.error(`[${this.serverName}] ${errorMsg}`);
        response.status(HttpResponse.BadRequest).send(`${errorMsg}`);
      }
    } else {
      const errorMsg: string = `No accessory found with type '${accessoryType}' and id '${accessoryId}'`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.NotFound).send(`${errorMsg}`);
    }
  }
}

class HttpResponse {

  static Ok: number = 200;
  static BadRequest: number = 400;
  static NotFound: number = 404;
}

class ChargingState {

  charging: boolean;
  charge: number;

  constructor(
    charging: boolean,
    charge: number,
  ) {
    this.charging = charging;
    this.charge = charge;
  }

  isEmpty() {
    return (this.charging === undefined &&
      this.charge === undefined);
  }
}

class ServerCertificate {

  private readonly caKeyFile = (domains: string) => `${this.certificatePath}ca-${domains}.key.pem`;
  private readonly caCertFile = (domains: string) => `${this.certificatePath}ca-${domains}.cert.pem`;
  private readonly serverKeyFile = (domains: string) => `${this.certificatePath}server-${domains}.key.pem`;
  private readonly serverCertFile = (domains: string) => `${this.certificatePath}server-${domains}.cert.pem`;

  private log: VirtualLogger;
  private serverName: string;
  private certificatePath: string;

  constructor (
    log: VirtualLogger,
    serverName: string,
    certificatePath: string,
  ) {
    this.log = log;
    this.serverName = serverName;
    this.certificatePath = certificatePath;
  }

  private generateCA(domains: string[]) {
    const ca: Certificate = createCA({
      organization: 'MyRoot',
      countryCode: 'US',
      state: 'CA',
      locality: 'San Jose',
      validity: 3650,   // 10 years
    });

    const domainsString: string = domains.join('-');
    fs.writeFileSync(this.caKeyFile(domainsString), ca.key);
    fs.writeFileSync(this.caCertFile(domainsString), ca.cert);
    return ca;
  }

  private generateServerCert(ca: Certificate, domains: string[]) {
    const cert:Certificate = createCert({
      ca,
      domains: ['127.0.0.1', 'localhost', ...domains],
      validity: 3650,   // 10 years
    });

    const domainsString: string = domains.join('-');
    fs.writeFile(this.serverKeyFile(domainsString), cert.key);
    fs.writeFile(this.serverCertFile(domainsString), cert.cert);
    return cert;
  }

  getCertificate(domains: string[]): Certificate | undefined {
    try {
      let certificate: Certificate | undefined;

      // Check if CA files exist
      const domainsString: string = domains.join('-');
      const serverKeyExists = fs.existsSync(this.serverKeyFile(domainsString));
      const serverCertExists = fs.existsSync(this.serverCertFile(domainsString));

      if (serverKeyExists && serverCertExists) {
        this.log.info(`[${this.serverName}] Using existing Certificates`);
        const serverKey = fs.readFileSync(this.serverKeyFile(domainsString), 'utf8');
        const serverCert = fs.readFileSync(this.serverCertFile(domainsString), 'utf8');
        certificate = { key: serverKey, cert: serverCert };
      } else {
        if (domains.length > 0) {
          const domainString: string = domains.join(', ');
          this.log.info(`[${this.serverName}] Generating Certificates for "${domainString}" ...`);
          const ca: Certificate = this.generateCA(domains);
          certificate = this.generateServerCert(ca, domains);
          this.log.info(`[${this.serverName}] Successfully generated Certificates for "${domainString}"`);
        }
        else {
          this.log.info(`[${this.serverName}] No domains specified`);
        }
      }

      return certificate;
    } catch (error) {
      this.log.error(`[${this.serverName}] Error generating certificates: ${error}`);
    }

    return;
  }
}
