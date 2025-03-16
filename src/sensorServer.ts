import express, { Express, Request, Response } from 'express';

import { VirtualAccessoriesLogger } from './virtualLogger.js';
import { Accessory } from './accessories/virtualAccessory.js';
import { UpdatableSensor } from './updatableSensor.js';

/**
 * Create server to accept sensor events
 */
export class SensorServer {

  private static accessoryIdPattern = '^[A-Za-z0-9\\-]{5,}$';

  private readonly accessories = new Map<string, Accessory>();
  private readonly log: VirtualAccessoriesLogger;

  private server: Express = express();
  private readonly port: number = 9076;

  constructor(
    accessories: Accessory[],
    log: VirtualAccessoriesLogger,
  ) {
    this.log = log;

    accessories.forEach((accessory) => {
      if ((<UpdatableSensor><unknown>accessory).updateSensor !== undefined) {
        this.accessories.set(accessory.accessoryConfiguration.accessoryID, accessory);
      }
    });

    // Routes

    this.server.post('/humidity', (request: Request, response: Response) => {
      const uuid: string = request.body.id;
      const humidity: string = request.body.value;

      if (this.accessoryIdIsValid(uuid, response) && this.humidityIsValid(humidity, response)) {
        this.processRequest(uuid, 'humidifierdehumidifier', Number(humidity), response);
      }
    });

    this.server.post('/temperature', (request: Request, response: Response) => {
      const uuid: string = request.body.id;
      const temperature: string = request.body.value;

      if (this.accessoryIdIsValid(uuid, response) && this.temperatureIsValid(temperature, response)) {
        this.processRequest(uuid, 'heatercooler', Number(temperature), response);
      }
    });

    this.server.listen(this.port, () => {
      this.log.info(`Sensor Server running on port ${this.port}`);
    });
  }

  private accessoryIdIsValid(
    accessoryId: string,
    response: Response,
  ): boolean {
    const patternRegex = new RegExp(SensorServer.accessoryIdPattern);
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
      const success: boolean = (<UpdatableSensor><unknown>accessory).updateSensor(value, accessoryId);

      if (success) {
        response.status(HttpResponse.Ok).send(`Set accessory with id: ${accessoryId} to value: ${value}`);
      } else {
        response.status(HttpResponse.BadRequest).send(`Bad value: ${value}`);
      }
    } else {
      response.status(HttpResponse.NotFound).send(`No accessory of type "${accessoryType}" with id "${accessoryId}" found`);
    }
  }
}

class HttpResponse {

  static Ok: number = 200;
  static BadRequest: number = 400;
  static NotFound: number = 404;
}
