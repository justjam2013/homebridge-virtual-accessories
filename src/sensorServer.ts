/* eslint-disable brace-style */
import express, { Express, Request, Response } from 'express';

import { VirtualAccessoriesLogger } from './virtualLogger.js';
import { Accessory } from './accessories/virtualAccessory.js';
import { UpdatableSensor } from './updatableSensor.js';
import { SensorValueUpdateNotAllowed } from './errors.js';

/**
 * Create server to accept sensor events
 */
export class SensorUpdateServer {

  private static accessoryIdPattern = '^[A-Za-z0-9\\-]{5,}$';

  private readonly accessories = new Map<string, Accessory>();
  private readonly log: VirtualAccessoriesLogger;

  private server: Express = express();
  readonly port: number = 9076;

  constructor(
    log: VirtualAccessoriesLogger,
  );
  constructor(
    log: VirtualAccessoriesLogger,
    accessories?: Accessory[],
  ) {
    this.log = log;

    if (accessories) {
      this.addAccessories(accessories);
    }

    // Routes

    this.server.post('/humidity', (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const humidity: string = request.body.value;

      if (this.accessoryIdIsValid(accessoryId, response) && this.humidityIsValid(humidity, response)) {
        this.processRequest(accessoryId, 'humidifierdehumidifier', Number(humidity), response);
      }
    });

    this.server.post('/temperature', (request: Request, response: Response) => {
      const accessoryId: string = request.body.id;
      const temperature: string = request.body.value;

      if (this.accessoryIdIsValid(accessoryId, response) && this.temperatureIsValid(temperature, response)) {
        this.processRequest(accessoryId, 'heatercooler', Number(temperature), response);
      }
    });

  }

  start() {
    this.server.listen(this.port, () => {
      this.log.info(`Sensor Server running on port ${this.port}`);
    });
  }

  addAccessories(
    accessories: Accessory[],
  ) {
    accessories.forEach((accessory) => {
      if ((<UpdatableSensor><unknown>accessory).updateSensor !== undefined) {
        this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
      }
    });
  }

  addAccessory(
    accessory: Accessory,
  ) {
    this.addAccessories([ accessory ]);
  }

  removeAccessory(
    accessory: Accessory,
  ): boolean {
    const found: boolean = this.accessories.delete(accessory.accessoryConfiguration.accessoryID);
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
      response.status(HttpResponse.BadRequest).send(`Invalid humidity value: ${humidity}`);
      return true;
    }

    return false;
  }

  private temperatureIsValid(
    temperature: string,
    response: Response,
  ): boolean {
    const temperatureDegrees = Number(temperature);

    if (isNaN(temperatureDegrees)) {
      response.status(HttpResponse.BadRequest).send(`Invalid temperature value: ${temperature}`);
      return true;
    }

    return false;
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

        response.status(HttpResponse.Ok).send(`Set accessory with id: ${accessoryId} to value: ${value}`);
      }
      catch (error) {
        let message: string = error as string;
        if (error instanceof SensorValueUpdateNotAllowed) {
          message = error.message;
        }
        response.status(HttpResponse.BadRequest).send(`${message}`);
      }
    } else {
      response.status(HttpResponse.NotFound).send(`No accessory found with type '${accessoryType}' and id '${accessoryId}'`);
    }
  }
}

class HttpResponse {

  static Ok: number = 200;
  static BadRequest: number = 400;
  static NotFound: number = 404;
}
