/* eslint-disable brace-style */

import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';
import { BinarySensor } from '../binarySensor.js';
import { IkeaMatterStockTriggerConfiguration } from '../../configuration/triggers/configurationIkeaMatterStockTrigger.js';
import { Trigger } from './trigger.js';
import { Utils } from '../../utils/utils.js';

import * as cheerio from 'cheerio';

/**
 * IkeaMatterStockTrigger - Trigger implementation
 */
export class IkeaMatterStockTrigger extends Trigger {

  private easyrebuildURL = (countryCode: string, itemNumber: string) =>
    `https://easyrebuild.com/stock?country=${countryCode}&itemNo=${itemNumber}`;

  private count: number = 0;

  constructor(
    sensor: BinarySensor,
    name: string,
  ) {
    super(sensor, name);

    const triggerConfig: IkeaMatterStockTriggerConfiguration = this.sensorConfig.ikeaMatterStockTrigger;

    if (triggerConfig.isDisabled) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Ikea Matter Stock trigger is disabled`);
      return;
    }

    this.start(this, triggerConfig);
  }

  private async start(
    trigger: IkeaMatterStockTrigger,
    triggerConfig: IkeaMatterStockTriggerConfiguration,
  ) {
    await Utils.delay(10000);  // 10 second delay
    
    trigger.checkStockAvailability(trigger, triggerConfig, true);

    const intervalBetweenChecksMillis = 60 * 60 * 1000;   // trigger.intervalBetweenChecksMillis: 60 minutes

    setInterval(
      trigger.checkStockAvailability, intervalBetweenChecksMillis,
      trigger,
      triggerConfig,
      false,
    );
  }

  /**
   * Private methods
   */
  private async checkStockAvailability(
    trigger: IkeaMatterStockTrigger,
    triggerConfig: IkeaMatterStockTriggerConfiguration,
    firstRun: boolean,
  ) {
    const sensorConfig: AccessoryConfiguration = trigger.sensor.accessoryConfiguration;

    const countryCode: string | undefined = trigger.getCountryCode(triggerConfig.country);
    if (countryCode === undefined) {
      trigger.log.error(`[${sensorConfig.accessoryName}] Country not supported: ${triggerConfig.country}`);
      return;
    }
    trigger.log.debug(`[${sensorConfig.accessoryName}] Country code: ${triggerConfig.country} - ${countryCode}`);

    const itemCode: string | undefined = trigger.getItemCode(countryCode, triggerConfig.itemName);
    if (itemCode === undefined) {
      trigger.log.error(`[${sensorConfig.accessoryName}] Item not supported: ${triggerConfig.itemName}`);
      return;
    }
    else if (itemCode === '') {
      trigger.log.error(`[${sensorConfig.accessoryName}] Unknown item code for: ${triggerConfig.itemName} in ${triggerConfig.country}`);
      return;
    }
    trigger.log.debug(`[${sensorConfig.accessoryName}] Item code: ${triggerConfig.itemName} - ${itemCode}`);

    const html: string | undefined = await trigger.getHtml(countryCode, itemCode, trigger, sensorConfig.accessoryName);
    if (html === undefined) {
      return;
    }

    trigger.log.debug(`[${sensorConfig.accessoryName}] Retrieved Ikea matter stock data`);

    const dom = cheerio.load(html);

    let foundLocation: boolean = false;

    const selector: string = 'table.table tbody tr.expandable-row';
    dom(`${selector}`).each((_, row) => {
      const cells = dom(row).find('td');

      if (cells.length < 2) {
        // Next row
        return;
      }

      const store: string = dom(cells[0]).text().replace(/\s+/g, ' ').trim();
      const count: string = dom(cells[1]).text().replace(/\s+/g, ' ').trim();

      if (store.toLowerCase().startsWith('ikea') && store.toLowerCase().endsWith(triggerConfig.storeLocation.toLowerCase())) {
        foundLocation = true;

        const countNum: number = Number.parseInt(count);
        if (Number.isNaN(countNum)) {
          trigger.log.error(`[${sensorConfig.accessoryName}] Error in Ikea matter stock data. Count is not a number`);
        }
        else if (countNum > 0) {
          if (trigger.sensor.getSensorState() !== BinarySensor.TRIGGERED || firstRun === true || countNum !== trigger.count) {
            // eslint-disable-next-line max-len
            trigger.log.info(`[${sensorConfig.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${triggerConfig.itemName} in ${triggerConfig.storeLocation}`);

            trigger.sensor.triggerSensorState(BinarySensor.TRIGGERED, trigger);
            trigger.count = countNum;
          }
          else {
            // eslint-disable-next-line max-len
            trigger.log.debug(`[${sensorConfig.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${triggerConfig.itemName} in ${triggerConfig.storeLocation}`);
          }
        }
        else {
          if (trigger.sensor.getSensorState() !== BinarySensor.NORMAL || firstRun === true) {
            // eslint-disable-next-line max-len
            trigger.log.info(`[${sensorConfig.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${triggerConfig.itemName} in ${triggerConfig.storeLocation}`);

            trigger.sensor.triggerSensorState(BinarySensor.NORMAL, trigger);
          }
          else {
            // eslint-disable-next-line max-len
            trigger.log.debug(`[${sensorConfig.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${triggerConfig.itemName} in ${triggerConfig.storeLocation}`);
          }
        }

        return false; // breaks out of the loop
      }
    });

    if (foundLocation === false) {
      trigger.log.info(`[${sensorConfig.accessoryName}] Location ${triggerConfig.storeLocation} not found in ${triggerConfig.country}`);
    }
  }

  private async getHtml(
    countryCode: string,
    itemCode: string,
    trigger: IkeaMatterStockTrigger,
    accessoryName: string,
  ): Promise<string | undefined> {
    const productCodes: string[] = [itemCode, itemCode.replaceAll('.', '')];

    for (const productCode of productCodes) {
      const request = new Request(trigger.easyrebuildURL(countryCode, productCode), { method: 'GET' });
      trigger.log.debug(`[${accessoryName}] Requesting Ikea matter stock data from: ${(request.url)}`);

      let htmlFetchResponse: globalThis.Response | undefined;
      try {
        htmlFetchResponse = await fetch(request);
      } catch (error) {
        trigger.log.error(`[${accessoryName}] Failed retrieving Ikea matter stock data: ${JSON.stringify(error)}`);
        continue;
      }

      if (htmlFetchResponse === undefined || !htmlFetchResponse.ok) {
        trigger.log.error(`[${accessoryName}] Error retrieving Ikea matter stock data. Response status: ${htmlFetchResponse?.status}`);
        continue;
      }

      const html: string | undefined = await htmlFetchResponse!.text();
      if (html === undefined) {
        trigger.log.error(`[${accessoryName}] Response did not return html`);
        continue;
      }
      else if (html.includes('is not a valid product number')) {
        // Try the next format
        continue;
      }

      return html;
    }

    trigger.log.error(`[${accessoryName}] Not a valid product number: "${productCodes[0]}" / "${productCodes[1]}"`);

    return undefined;
  }

  private getCountryCode(countryName: string): string | undefined {
    const countryCodes = new Map<string, string>([
      // ***** North America *****
      ['USA', 'us'],
      ['Canada', 'ca'],
      // ***** Europe *****
      ['UK', 'gb'],
      // ***** Asia *****
      ['Japan', 'jp'],
      ['Korea', 'kr'],
      // ***** Oceania *****
      ['Australia', 'au'],
      ['New Zealand', 'nz'],
    ]);

    return countryCodes.get(countryName);
  }

  private getItemCode(
    countryCode: string,
    itemName: string,
  ): string | undefined {
    const countryCodes = new Map<string, Map<string, string>>([
      // ***** North America *****
      [
        // USA
        'us', new Map<string, string>([
          ['ALPSTUGA', '706.093.96'],
          ['BILRESA', '806.178.76'],
          ['GRILLPLATS', '706.247.40'],
          ['KLIPPBOK', '506.177.69'],
          ['MYGGBETT', '606.176.41'],
          ['MYGGSPRAY', '806.194.51 '],
          ['TIMMERFLOTTE', '506.189.57 '],
        ]),
      ],
      [
        // Canada
        'ca', new Map<string, string>([
          ['ALPSTUGA', '706.093.96'],
          ['BILRESA', '806.178.76'],
          ['GRILLPLATS', '706.247.40'],
          ['KLIPPBOK', '506.177.69'],
          ['MYGGBETT', '606.176.41'],
          ['MYGGSPRAY', '806.194.51 '],
          ['TIMMERFLOTTE', '506.189.57 '],
        ]),
      ],
      // ***** Europe *****
      [
        // UK
        'gb', new Map<string, string>([
          ['ALPSTUGA', '506.041.87'],
          ['BILRESA', '706.178.72'],
          ['GRILLPLATS', '606.247.45'],
          ['KLIPPBOK', '906.246.40'],
          ['MYGGBETT', '006.247.05'],
          ['MYGGSPRAY', '306.246.95'],
          ['TIMMERFLOTTE', '606.189.52'],
        ]),
      ],
      // ***** Asia *****
      [
        // Japan
        'jp', new Map<string, string>([
          ['ALPSTUGA', ''],
          ['BILRESA', '506.178.68'],
          ['GRILLPLATS', ''],
          ['KLIPPBOK', '706.177.68'],
          ['MYGGBETT', '406.176.42'],
          ['MYGGSPRAY', '006.194.50'],
          ['TIMMERFLOTTE', ''],
        ]),
      ],
      [
        // Korea
        'kr', new Map<string, string>([
          ['ALPSTUGA', ''],
          ['BILRESA', ''],
          ['GRILLPLATS', ''],
          ['KLIPPBOK', '706.177.68'],
          ['MYGGBETT', '406.176.42'],
          ['MYGGSPRAY', '006.194.50'],
          ['TIMMERFLOTTE', ''],
        ]),
      ],
      // ***** Oceania *****
      [
        // Australia
        'au', new Map<string, string>([
          ['ALPSTUGA', '706.093.77'],
          ['BILRESA', '506.178.68'],
          ['GRILLPLATS', '306.247.42'],
          ['KLIPPBOK', '706.177.68'],
          ['MYGGBETT', '406.176.42'],
          ['MYGGSPRAY', '006.194.50'],
          ['TIMMERFLOTTE', '006.189.50'],
        ]),
      ],
      [
        // New Zealand
        'nz', new Map<string, string>([
          ['ALPSTUGA', '706.093.77'],
          ['BILRESA', '506.178.68'],
          ['GRILLPLATS', '306.247.42'],
          ['KLIPPBOK', '706.177.68'],
          ['MYGGBETT', '406.176.42'],
          ['MYGGSPRAY', '006.194.50'],
          ['TIMMERFLOTTE', '006.189.50'],
        ]),
      ],
    ]);

    return countryCodes.get(countryCode)?.get(itemName);
  }
}
