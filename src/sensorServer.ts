/* eslint-disable brace-style */

import { Server } from 'http';
import { Accessory } from './accessories/virtualAccessory.js';
import { SensorValueUpdateNotAllowed } from './errors.js';
import { TriggerableSensor } from './triggerableSensor.js';
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

    const routeTrigger: string = '/trigger';
    this.log.info(`[${this.serverName}] Setting up route: ${routeTrigger}`);
    this.server.post(routeTrigger, (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const trigger: boolean = request.body.value;

      this.log.debug(`[${this.serverName}] Request: ${request.method} ${request.path}, ${JSON.stringify(request.body)}`);

      if (this.accessoryIdIsValid(accessoryId, response) && this.triggerIsValid(trigger, response)) {
        this.processRequest(accessoryId, 'securitysystem', trigger, response);
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
      this.log.error(`[${this.serverName}] Bad Request: Invalid accessory id ${accessoryId}`);
      response.status(HttpResponse.BadRequest).send(`Invalid accessory id: ${accessoryId}`);

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
      this.log.error(`[${this.serverName}] Bad Request: Invalid humidity value ${humidity}`);
      response.status(HttpResponse.BadRequest).send(`Invalid humidity value: ${humidity}`);

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
      this.log.error(`[${this.serverName}] Bad Request: Invalid temperature value ${temperature}`);
      response.status(HttpResponse.BadRequest).send(`Invalid temperature value: ${temperature}`);

      return false;
    }

    return true;
  }

  private obstructionIsValid(
    obstruction: boolean,
    response: Response,
  ): boolean {
    if (typeof obstruction !== 'boolean') {
      this.log.error(`[${this.serverName}] Bad Request: Invalid obstruction value ${obstruction}`);
      response.status(HttpResponse.BadRequest).send(`Invalid obstruction value: ${obstruction}`);

      return false;
    }

    return true;
  }

  private triggerIsValid(
    trigger: boolean,
    response: Response,
  ): boolean {
    if (typeof trigger !== 'boolean') {
      this.log.error(`[${this.serverName}] Bad Request: Invalid trigger value ${trigger}`);
      response.status(HttpResponse.BadRequest).send(`Invalid trigger value: ${trigger}`);

      return false;
    }

    return true;
  }

  private processRequest(
    accessoryId: string,
    accessoryType: string,
    value: number | boolean,
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

        this.log.debug(`[${this.serverName}] Set accessory with id: ${accessoryId} to value: ${value}`);
        response.status(HttpResponse.Ok).send(`Set accessory with id: ${accessoryId} to value: ${value}`);
      }
      catch (error) {
        let message: string = error as string;
        if (error instanceof SensorValueUpdateNotAllowed) {
          message = error.message;
        }

        this.log.error(`[${this.serverName}] Bad Request: ${message}`);
        response.status(HttpResponse.BadRequest).send(`${message}`);
      }
    } else {
      this.log.error(`[${this.serverName}] Not Found: No accessory found with type '${accessoryType}' and id '${accessoryId}`);
      response.status(HttpResponse.NotFound).send(`No accessory found with type '${accessoryType}' and id '${accessoryId}'`);
    }
  }
}

class HttpResponse {

  static Ok: number = 200;
  static BadRequest: number = 400;
  static NotFound: number = 404;
}
