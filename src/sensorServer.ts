/* eslint-disable brace-style */

import { Server } from 'http';
import { Accessory } from './accessories/virtualAccessory.js';
import { Sensor } from './sensors/virtualSensor.js';
import { SensorValueUpdateNotAllowed } from './errors.js';
import { Trigger } from './triggers/trigger.js';
import { TriggerableSensor } from './triggerableSensor.js';
import { UpdatableChargingState } from './updatableChargingState.js';
import { UpdatableObstruction } from './updatableObstruction.js';
import { UpdatableSensor } from './updatableSensor.js';
import { VirtualAccessoriesLogger } from './virtualLogger.js';

import express, { Express, Request, Response } from 'express';

/**
 * Create server to accept sensor events
 */
export class SensorUpdateServer {

  private static accessoryIdPattern = '^[A-Za-z0-9\\-]{5,}$';

  private readonly accessories = new Map<string, Accessory>();
  private readonly log: VirtualAccessoriesLogger;

  private readonly serverName: string = 'Sensor Server';

  private server: Express = express();
  private httpServer?: Server;
  readonly port: number;

  constructor(
    log: VirtualAccessoriesLogger,
    port: number
  );
  constructor(
    log: VirtualAccessoriesLogger,
    port: number,
    accessories?: Accessory[],
  ) {
    this.log = log;
    this.port = port;

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

      if (this.accessoryIdIsValid(accessoryId, response) && this.humidityIsValid(humidity, response)) {
        this.processRequest(accessoryId, 'humidifierdehumidifier', Number(humidity), response);
      }
    });

    const routeTemperature: string = '/temperature';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTemperature}`);
    this.server.post(routeTemperature, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const temperature: string = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.temperatureIsValid(temperature, response)) {
        this.processRequest(accessoryId, 'heatercooler', Number(temperature), response);
      }
    });

    const routeObstruction: string = '/obstruction';
    this.log.info(`[${this.serverName}] Setting up route: ${routeObstruction}`);
    this.server.post(routeObstruction, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const obstruction: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.obstructionIsValid(obstruction, response)) {
        this.processRequest(accessoryId, 'garagedoor', obstruction, response);
      }
    });

    const routeTriggerAlarm: string = '/triggeralarm';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerAlarm}`);
    this.server.post(routeTriggerAlarm, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const trigger: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.triggerIsValid(trigger, response)) {
        this.processRequest(accessoryId, 'securitysystem', trigger, response);
      }
    });

    const routeTriggerSensor: string = '/triggersensor';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTriggerSensor}`);
    this.server.post(routeTriggerSensor, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const trigger: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.triggerIsValid(trigger, response)) {
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
        this.processRequest(accessoryId, 'sensor', chargingState, response);
      }
    });
  }

  start() {
    this.log.info(`[${this.serverName}] Starting Sensor Server`);
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

    if ((<UpdatableSensor><unknown>accessory).updateSensor !== undefined) {
      this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
      addedAccessory = true;
    }
    else if ((<TriggerableSensor><unknown>accessory).triggerSensor !== undefined) {
      this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
      addedAccessory = true;
    }
    else if ((<UpdatableObstruction><unknown>accessory).updateObstruction !== undefined) {
      this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
      addedAccessory = true;
    }
    else if ((<UpdatableChargingState><unknown>accessory).updateChargingState !== undefined) {
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
    const patternRegex = new RegExp(SensorUpdateServer.accessoryIdPattern);
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

  private humidityIsValid(
    humidity: string,
    response: Response,
  ): boolean {
    const humidityPercent = Number(humidity);

    if (isNaN(humidityPercent) || humidityPercent < 0 || humidityPercent > 100) {
      const errorMsg: string = `Invalid humidity value: ${humidity}. Value must be a percentage`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private temperatureIsValid(
    temperature: string,
    response: Response,
  ): boolean {
    const temperatureDegrees = Number(temperature);

    if (isNaN(temperatureDegrees)) {
      const errorMsg: string = `Invalid temperature value: ${temperature}. Value must be a number`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private obstructionIsValid(
    obstruction: boolean,
    response: Response,
  ): boolean {
    if (typeof obstruction !== 'boolean') {
      const errorMsg: string = `Invalid obstruction value: ${obstruction}. Value must be a boolean`;
      this.log.error(`[${this.serverName}] ${errorMsg}`);
      response.status(HttpResponse.BadRequest).send(`${errorMsg}`);

      return false;
    }

    return true;
  }

  private triggerIsValid(
    trigger: boolean,
    response: Response,
  ): boolean {
    if (typeof trigger !== 'boolean') {
      const errorMsg: string = `Invalid trigger value: ${trigger}. Value must be a boolean`;
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
        if ((<UpdatableSensor><unknown>accessory).updateSensor !== undefined) {
          (<UpdatableSensor><unknown>accessory).updateSensor(<number>value, accessoryId);
        }
        else if ((<UpdatableObstruction><unknown>accessory).updateObstruction !== undefined) {
          (<UpdatableObstruction><unknown>accessory).updateObstruction(<boolean>value, accessoryId);
        }
        else if ((<TriggerableSensor><unknown>accessory).triggerSensor !== undefined) {
          (<TriggerableSensor><unknown>accessory).triggerSensor(<boolean>value, accessoryId);
        }
        else if ((<UpdatableChargingState><unknown>accessory).updateChargingState !== undefined) {
          const chargingState: ChargingState = (<ChargingState>value);
          (<UpdatableChargingState><unknown>accessory).updateChargingState(chargingState.charging, chargingState.charge, accessoryId);
        }
        else if (accessory instanceof Sensor) {
          const trigger: Trigger = (<Sensor><unknown>accessory).getTrigger();
          if ((<TriggerableSensor><unknown>trigger).triggerSensor !== undefined) {
            (<TriggerableSensor><unknown>trigger).triggerSensor(<boolean>value, accessoryId);
          }
        }

        const message: string = `Set accessory with id: ${accessoryId} to value: ${value}`;
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
