import { Accessory } from './accessory.js';

/**
 * 
 */
export interface TriggerableEventAccessory {

  triggerEvent(companionAccessory: Accessory): void;
}
