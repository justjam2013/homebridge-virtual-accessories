/* eslint-disable brace-style */

import { Accessory } from './accessories/virtualAccessory.js';
import { SensorValueUpdateNotAllowed } from './errors.js';
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
    this.server.use(express.urlencoded());

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
  }

  start() {
    this.log.info(`[${this.serverName}] Starting Sensor Server`);
    this.server.listen(this.port, () => {
      this.log.info(`[${this.serverName}] Sensor Server running on port ${this.port}`);
    });
  }

  addAccessories(
    accessories: Accessory[],
  ) {
    accessories.forEach((accessory) => {
      if ((<UpdatableSensor><unknown>accessory).updateSensor !== undefined) {
        this.addAccessory(accessory);
      }
    });
  }

  addAccessory(
    accessory: Accessory,
  ) {
    this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);

    this.log.info(`[${this.serverName}] Added accessory ${accessory.accessoryConfiguration.accessoryName}`);
  }

  removeAccessory(
    accessory: Accessory,
  ): boolean {
    const found: boolean = this.accessories.delete(accessory.accessoryConfiguration.accessoryID);
    this.log.info(`[${this.serverName}] Removed accessory ${accessory.accessoryConfiguration.accessoryName}`);

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

  private processRequest(
    accessoryId: string,
    accessoryType: string,
    value: number,
    response: Response,
  ) {
    const accessory: Accessory | undefined = this.accessories.get(accessoryId);

    if (accessory !== undefined && accessory.accessoryConfiguration.accessoryType === accessoryType) {
      try {
        (<UpdatableSensor><unknown>accessory).updateSensor(value, accessoryId);

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
