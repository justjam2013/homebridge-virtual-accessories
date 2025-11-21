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

import { SensorValueUpdateNotAllowed } from './errors.js';

import express, { Express, Request, Response } from 'express';

 
function ToBoolean(value: string): boolean {
  switch (value) {
  case 'true':
    return true;
  case 'false':
    return false;
  default:
    throw new Error('Invalid boolean string');
  }
}

/**
 * WebhookServer
 */
export class WebhookServer {

  private static accessoryIdPattern: string = '^[A-Za-z0-9\\-]{5,}$';

  private readonly accessories: Map<string, Accessory> = new Map<string, Accessory>();
  private readonly log: VirtualLogger;

  private readonly serverName: string = 'Sensor Server';

  private server: Express = express();
  private httpServer?: Server;
  readonly port: number;

  private useQueryParams: boolean;

  constructor(
    log: VirtualLogger,
    port: number,
    useQueryParams?: boolean,
  );
  constructor(
    log: VirtualLogger,
    port: number,
    useQueryParams: boolean = false,
    accessories?: Accessory[],
  ) {
    this.log = log;
    this.port = port;
    this.useQueryParams = useQueryParams;

    // parse application/x-www-form-urlencoded
    this.server.use(express.urlencoded({ extended: true }));

    // parse application/json
    this.server.use(express.json());

    if (accessories) {
      this.addAccessories(accessories);
    }

    // Routes

    // id
    // value: number
    const routeHumidity: string = '/humidity';
    this.log.info(`[${this.serverName}] Setting up route: ${routeHumidity}`);
    this.server.post(routeHumidity, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const humidity: string = (this.useQueryParams) ? request.query.value : request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.percentageIsValid(humidity, response))
      {
        this.processRequest(accessoryId, 'humidifierdehumidifier', Number(humidity), response);
      }
    });

    // id
    // value: number
    const routeTemperature: string = '/temperature';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTemperature}`);
    this.server.post(routeTemperature, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const temperature: string = (this.useQueryParams) ? request.query.value : request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.numberIsValid(temperature, response))
      {
        this.processRequest(accessoryId, 'heatercooler', Number(temperature), response);
      }
    });

    // id
    // value: boolean
    const routeObstruction: string = '/obstruction';
    this.log.info(`[${this.serverName}] Setting up route: ${routeObstruction}`);
    this.server.post(routeObstruction, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const obstruction: string = (this.useQueryParams) ? request.query.value : request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.booleanIsValid(obstruction, response))
      {
        this.processRequest(accessoryId, 'garagedoor', ToBoolean(obstruction), response);
      }
    });

    // id
    // value: boolean
    const routeTriggerAlarm: string = '/triggeralarm';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerAlarm}`);
    this.server.post(routeTriggerAlarm, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const trigger: string = (this.useQueryParams) ? request.query.value : request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.booleanIsValid(trigger, response))
      {
        // eslint-disable-next-line max-len
        this.processRequest(accessoryId, 'securitysystem', (ToBoolean(trigger) ? SecurityServiceTriggerType.TriggerAlarm : SecurityServiceTriggerType.None), response);
      }
    });

    // id
    // value: boolean
    const routeTriggerPanic: string = '/triggerpanic';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerPanic}`);
    this.server.post(routeTriggerPanic, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const trigger: string = (this.useQueryParams) ? request.query.value : request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.booleanIsValid(trigger, response))
      {
        // eslint-disable-next-line max-len
        this.processRequest(accessoryId, 'securitysystem', (ToBoolean(trigger) ? SecurityServiceTriggerType.TriggerPanic : SecurityServiceTriggerType.None), response);
      }
    });

    // id
    // value: boolean
    const routeTriggerSensor: string = '/triggersensor';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerSensor}`);
    this.server.post(routeTriggerSensor, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const trigger: string = (this.useQueryParams) ? request.query.value : request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.booleanIsValid(trigger, response))
      {
        this.processRequest(accessoryId, 'sensor', ToBoolean(trigger), response);
      }
    });

    // id
    // charging: boolean
    // charge: number
    const routeChargingState: string = '/chargingstate';
    this.log.info(`[${this.serverName}] Setting up route: ${routeChargingState}`);
    this.server.post(routeChargingState, (request: Request, response: Response) => {
      const accessoryId: string = (this.useQueryParams) ? request.query.id : request.body.id;
      const charging: string = (this.useQueryParams) ? request.query.charging : request.body.charging;
      const charge: string = (this.useQueryParams) ? Number(<string>request.query.charge) : request.body.charge;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${this.getRequestParameters(request)}`);

      if (this.parametersArePresent(request, response) &&
          this.accessoryIdIsValid(accessoryId, response) &&
          this.booleanIsValid(charging, response) &&
          this.numberIsValid(charge, response))
      {
        const chargingState: ChargingState = new ChargingState(ToBoolean(charging), Number(charge));
        this.processRequest(accessoryId, 'battery', chargingState, response);
      }
    });
  }

  start() {
    this.log.info(`[${this.serverName}] Starting Sensor Server ${this.useQueryParams ? 'with query params workaround' : ''}`);
    this.httpServer = this.server.listen(this.port, () => {
      this.log.info(`[${this.serverName}] Sensor Server running on port ${this.port}`);
    });
  }

  stop() {
    this.log.info(`[${this.serverName}] Stopping Sensor Server`);
    this.httpServer?.close(() => {
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
    value: string,
    response: Response,
  ): boolean {
    const valueBoolean: boolean = ['true', 'false'].includes(value.toLowerCase());

    if (!valueBoolean) {
      const errorMsg: string = `Invalid value: ${value}. Value must be a boolean`;
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

  private parametersArePresent(
    request: Request,
    response: Response,
  ): boolean {
    this.log.debug(`[${this.serverName}] useQueryParams: ${this.useQueryParams}`);
    this.log.debug(`[${this.serverName}] POST body: ${JSON.stringify(request.body)}`);
    this.log.debug(`[${this.serverName}] POST query: ${JSON.stringify(request.query)}`);

    // POST body
    if (!this.useQueryParams && JSON.stringify(request.body) === '{}') {
      const errorMsg: string = 'No parameters found in POST body';
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }
    // POST query
    if (this.useQueryParams && JSON.stringify(request.query) === '{}') {
      const errorMsg: string = 'No parameters found in POST query. The webhook server is using query parameters';
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }
  
  private getRequestParameters(
    request: Request,
  ): string {
    const params: string = (this.useQueryParams) ? JSON.stringify(request.query) : JSON.stringify(request.body);

    this.log.debug(`[${this.serverName}] useQueryParams: ${this.useQueryParams}`);
    this.log.debug(`[${this.serverName}] POST ${this.useQueryParams ? 'query' : 'body'}: ${params}`);

    return params;
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
