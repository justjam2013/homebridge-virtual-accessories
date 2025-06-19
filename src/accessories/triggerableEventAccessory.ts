import { Accessory } from './virtualAccessory.js';

/**
 * 
 */
export interface TriggerableEventAccessory {
  triggerEvent(companionAccessory: Accessory);
}
