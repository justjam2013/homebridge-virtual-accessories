/* eslint-disable brace-style */

import { Service } from 'homebridge';

import { BinarySensor } from '../binarySensor.js';
import { IkeaMatterStockTriggerConfiguration } from '../../configuration/triggers/configurationIkeaMatterStockTrigger.js';
import { Trigger } from './trigger.js';
import { shutdownSignal, Utils } from '../../utils/utils.js';

import * as cheerio from 'cheerio';
import { TriggeredState } from '../sensorCharacteristics.js';

/**
 * IkeaMatterStockTrigger - Trigger implementation
 */
export class IkeaMatterStockTrigger extends Trigger {

  private easyrebuildURL = (countryCode: string, itemNumber: string) =>
    `https://easyrebuild.com/stock?country=${countryCode}&itemNo=${itemNumber}`;

  private count: number = 0;

  constructor(
    sensor: BinarySensor<typeof Service>,
    name: string,
  ) {
    super(sensor, name);

    const triggerConfig: IkeaMatterStockTriggerConfiguration = this.sensorConfig.ikeaMatterStockTrigger;

    if (triggerConfig.isDisabled) {
      this.log.info(`[${this.accessoryName}] Ikea Matter Stock trigger is disabled`);
      return;
    }

    this.start(this, triggerConfig);
  }

  private async start(
    trigger: IkeaMatterStockTrigger,
    triggerConfig: IkeaMatterStockTriggerConfiguration,
  ) {
    await Utils.delay(
      10000,
      trigger.accessoryName,
      trigger.log,
    );  // 10 second delay
    
    trigger.checkStockAvailability(trigger, triggerConfig, true);

    const intervalBetweenChecksMillis = 60 * 60 * 1000;   // trigger.intervalBetweenChecksMillis: 60 minutes

    setInterval(
      trigger.checkStockAvailability, intervalBetweenChecksMillis,
      trigger,
      triggerConfig,
      false,
    )
      .unref();
  }

  /**
   * Private methods
   */
  private async checkStockAvailability(
    trigger: IkeaMatterStockTrigger,
    triggerConfig: IkeaMatterStockTriggerConfiguration,
    firstRun: boolean,
  ) {
    if (shutdownSignal.isShuttingDown) {return;}
    
    const countryCode: string | undefined = trigger.getCountryCode(triggerConfig.country);
    if (countryCode === undefined) {
      trigger.log.error(`[${trigger.accessoryName}] Country not supported: ${triggerConfig.country}`);
      return;
    }
    trigger.log.debug(`[${trigger.accessoryName}] Country code: ${triggerConfig.country} - ${countryCode}`);

    const itemInfo: string[] | undefined = trigger.getItemInfo(countryCode, triggerConfig.itemName);
    if (itemInfo === undefined) {
      trigger.log.error(`[${trigger.accessoryName}] Item not supported: ${triggerConfig.itemName}`);
      return;
    }
    const itemCode: string = itemInfo[0];
    const displayName: string = itemInfo[1];
    if (itemCode === '') {
      trigger.log.error(`[${trigger.accessoryName}] Unknown item code for: ${displayName} in ${triggerConfig.country}`);
      return;
    }
    trigger.log.debug(`[${trigger.accessoryName}] Item code: ${displayName} - ${itemCode}`);

    const html: string | undefined = await trigger.getHtml(countryCode, itemCode, trigger);
    if (html === undefined) {
      return;
    }

    trigger.log.debug(`[${trigger.accessoryName}] Retrieved Ikea matter stock data`);

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
          trigger.log.error(`[${trigger.accessoryName}] Error in Ikea matter stock data. Count is not a number`);
        }
        else if (countNum > 0) {
          if (trigger.sensor.getSensorState() !== TriggeredState.TRIGGERED || firstRun === true || countNum !== trigger.count) {
             
            trigger.log.info(`[${trigger.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${displayName} in ${triggerConfig.storeLocation}`);

            trigger.sensor.triggerSensorState(TriggeredState.TRIGGERED, trigger);
            trigger.count = countNum;
          }
          else {
            // eslint-disable-next-line max-len
            trigger.log.debug(`[${trigger.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${displayName} in ${triggerConfig.storeLocation}`);
          }
        }
        else {
          if (trigger.sensor.getSensorState() !== TriggeredState.NORMAL || firstRun === true) {
             
            trigger.log.info(`[${trigger.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${displayName} in ${triggerConfig.storeLocation}`);

            trigger.sensor.triggerSensorState(TriggeredState.NORMAL, trigger);
          }
          else {
            // eslint-disable-next-line max-len
            trigger.log.debug(`[${trigger.accessoryName}] Ikea matter stock data shows a count of ${countNum} ${displayName} in ${triggerConfig.storeLocation}`);
          }
        }

        return false; // breaks out of the loop
      }
    });

    if (foundLocation === false) {
      trigger.log.info(`[${trigger.accessoryName}] Location ${triggerConfig.storeLocation} not found in ${triggerConfig.country}`);
    }
  }

  private async getHtml(
    countryCode: string,
    itemCode: string,
    trigger: IkeaMatterStockTrigger,
  ): Promise<string | undefined> {
    const productCodes: string[] = [itemCode, itemCode.replaceAll('.', '')];

    let validProductNumber: boolean = true;
    const errorMessages: string[] = [];

    for (const productCode of productCodes) {
      const request = new Request(trigger.easyrebuildURL(countryCode, productCode), { method: 'GET' });
      trigger.log.debug(`[${trigger.accessoryName}] Requesting Ikea matter stock data from: ${(request.url)}`);

      let htmlFetchResponse: globalThis.Response | undefined;
      try {
        htmlFetchResponse = await fetch(request);
      } catch (error) {
        errorMessages.push( `Failed retrieving Ikea matter stock data: ${JSON.stringify(error)}`);
        continue;
      }

      if (htmlFetchResponse === undefined || !htmlFetchResponse.ok) {
        errorMessages.push(`Error retrieving Ikea matter stock data. Response status: ${htmlFetchResponse?.status}`);
        continue;
      }

      const html: string | undefined = await htmlFetchResponse!.text();
      if (html === undefined) {
        errorMessages.push('Response did not return html');
        continue;
      }
      else if (html.includes('is not a valid product number')) {
        validProductNumber = false;
        // Try the next format
        continue;
      }

      return html;
    }

    if (validProductNumber !== true) {
      const itemName = trigger.sensorConfig.ikeaMatterStockTrigger.itemName;
      trigger.log.error(`[${trigger.accessoryName}] Not a valid product number for ${itemName}: "${productCodes[0]}" / "${productCodes[1]}"`);
    }
    else {
      for (const errorMsg of errorMessages) {
        trigger.log.error(`[${trigger.accessoryName}] ${errorMsg}`);
      }
    }

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

  private getItemInfo(
    countryCode: string,
    itemName: string,
  ): string[] | undefined {
    const countryCodes = new Map<string, Map<string, string[]>>([
      // ***** North America *****
      [
        // USA
        'us', new Map<string, string[]>([
          ['ALPSTUGA',     ['706.093.96', 'ALPSTUGA']],
          ['BILRESA',      ['806.178.76', 'BILRESA']],
          ['GRILLPLATS',   ['706.247.40', 'GRILLPLATS']],
          ['KLIPPBOK',     ['506.177.69', 'KLIPPBOK']],
          ['MYGGBETT',     ['606.176.41', 'MYGGBETT']],
          ['MYGGSPRAY',    ['806.194.51', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['506.189.57', 'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['306.114.62', 'KAJPLATS E26 Color 1100lm']],
          ['KAJPLATS-WHITE-S', ['606.113.09', 'KAJPLATS E26 White 450lm']],
          ['KAJPLATS-WHITE-M', ['506.113.00', 'KAJPLATS E26 White 1100lm']],
          ['KAJPLATS-WHITE-L', ['406.113.05', 'KAJPLATS E26 White 1600lm']],
        ]),
      ],
      [
        // Canada
        'ca', new Map<string, string[]>([
          ['ALPSTUGA',     ['706.093.96', 'ALPSTUGA']],
          ['BILRESA',      ['806.178.76', 'BILRESA']],
          ['GRILLPLATS',   ['706.247.40', 'GRILLPLATS']],
          ['KLIPPBOK',     ['506.177.69', 'KLIPPBOK']],
          ['MYGGBETT',     ['606.176.41', 'MYGGBETT']],
          ['MYGGSPRAY',    ['806.194.51', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['506.189.57', 'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['106.114.63', 'KAJPLATS E26 Color 1100lm']],
          ['KAJPLATS-WHITE-S', ['606.113.09', 'KAJPLATS E26 White 450lm']],
          ['KAJPLATS-WHITE-M', ['506.113.00', 'KAJPLATS E26 White 1100lm']],
          ['KAJPLATS-WHITE-L', ['406.113.05', 'KAJPLATS E26 White 1600lm']],
        ]),
      ],
      // ***** Europe *****
      [
        // UK
        'gb', new Map<string, string[]>([
          ['ALPSTUGA',     ['506.041.87', 'ALPSTUGA']],
          ['BILRESA',      ['706.178.72', 'BILRESA']],
          ['GRILLPLATS',   ['606.247.45', 'GRILLPLATS']],
          ['KLIPPBOK',     ['906.246.40', 'KLIPPBOK']],
          ['MYGGBETT',     ['006.247.05', 'MYGGBETT']],
          ['MYGGSPRAY',    ['306.246.95', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['606.189.52', 'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['506.114.61', 'KAJPLATS E27 Color 1055lm']],
          ['KAJPLATS-WHITE-S', ['806.113.08', 'KAJPLATS E27 White 470lm']],
          ['KAJPLATS-WHITE-M', ['106.112.98', 'KAJPLATS E27 White 1055lm']],
          ['KAJPLATS-WHITE-L', ['906.113.03', 'KAJPLATS E27 White 1521lm']],
        ]),
      ],
      // ***** Asia *****
      [
        // Japan
        'jp', new Map<string, string[]>([
          ['ALPSTUGA',     ['',           'ALPSTUGA']],
          ['BILRESA',      ['506.178.68', 'BILRESA']],
          ['GRILLPLATS',   ['106.247.43', 'GRILLPLATS']],
          ['KLIPPBOK',     ['706.177.68', 'KLIPPBOK']],
          ['MYGGBETT',     ['406.176.42', 'MYGGBETT']],
          ['MYGGSPRAY',    ['006.194.50', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['',           'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['406.192.74', 'KAJPLATS E26 Color 1160lm']],
          ['KAJPLATS-WHITE-S', ['506.189.76', 'KAJPLATS E26 White 485lm']],
          ['KAJPLATS-WHITE-M', ['406.189.86', 'KAJPLATS E26 White 1160lm']],
          ['KAJPLATS-WHITE-L', ['806.190.12', 'KAJPLATS E26 White 1520lm']],
        ]),
      ],
      [
        // Korea
        'kr', new Map<string, string[]>([
          ['ALPSTUGA',     ['',           'ALPSTUGA']],
          ['BILRESA',      ['406.415.24', 'BILRESA']],
          ['GRILLPLATS',   ['506.247.41', 'GRILLPLATS']],
          ['KLIPPBOK',     ['706.177.68', 'KLIPPBOK']],
          ['MYGGBETT',     ['406.176.42', 'MYGGBETT']],
          ['MYGGSPRAY',    ['006.194.50', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['006.189.50', 'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['606.192.73', 'KAJPLATS E26 Color 1055lm']],
          ['KAJPLATS-WHITE-S', ['306.189.77', 'KAJPLATS E26 White 470lm']],
          ['KAJPLATS-WHITE-M', ['206.189.87', 'KAJPLATS E26 White 1055lm']],
          ['KAJPLATS-WHITE-L', ['006.190.11', 'KAJPLATS E26 White 1521lm']],
        ]),
      ],
      // ***** Oceania *****
      [
        // Australia
        'au', new Map<string, string[]>([
          ['ALPSTUGA',     ['706.093.77', 'ALPSTUGA']],
          ['BILRESA',      ['506.178.68', 'BILRESA']],
          ['GRILLPLATS',   ['306.247.42', 'GRILLPLATS']],
          ['KLIPPBOK',     ['706.177.68', 'KLIPPBOK']],
          ['MYGGBETT',     ['406.176.42', 'MYGGBETT']],
          ['MYGGSPRAY',    ['006.194.50', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['006.189.50', 'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['206.192.70', 'KAJPLATS E27 Color 1055lm']],
          ['KAJPLATS-WHITE-S', ['206.189.68', 'KAJPLATS E27 White 470lm']],
          ['KAJPLATS-WHITE-M', ['106.189.83', 'KAJPLATS E27 White 1055lm']],
          ['KAJPLATS-WHITE-L', ['806.190.07', 'KAJPLATS E27 White 1521lm']],
        ]),
      ],
      [
        // New Zealand
        'nz', new Map<string, string[]>([
          ['ALPSTUGA',     ['706.093.77', 'ALPSTUGA']],
          ['BILRESA',      ['506.178.68', 'BILRESA']],
          ['GRILLPLATS',   ['306.247.42', 'GRILLPLATS']],
          ['KLIPPBOK',     ['706.177.68', 'KLIPPBOK']],
          ['MYGGBETT',     ['406.176.42', 'MYGGBETT']],
          ['MYGGSPRAY',    ['006.194.50', 'MYGGSPRAY']],
          ['TIMMERFLOTTE', ['006.189.50', 'TIMMERFLOTTE']],
          ['KAJPLATS-COLOR-M', ['206.192.70', 'KAJPLATS E27 Color 1055lm']],
          ['KAJPLATS-WHITE-S', ['206.189.68', 'KAJPLATS E27 White 470lm']],
          ['KAJPLATS-WHITE-M', ['106.189.83', 'KAJPLATS E27 White 1055lm']],
          ['KAJPLATS-WHITE-L', ['806.190.07', 'KAJPLATS E27 White 1521lm']],
        ]),
      ],
    ]);

    return countryCodes.get(countryCode)?.get(itemName);
  }
}
