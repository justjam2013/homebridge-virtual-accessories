import { Service } from 'homebridge';

import { Accessory } from './accessory.js';

/**
 * 
 */
export interface TriggerableEventAccessory {

  triggerEvent(companionAccessory: Accessory<typeof Service>);
}
