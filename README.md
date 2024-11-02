# homebridge-virtual-accessories

#### homebridge-virtual-accessories is a plugin for Homebridge. It provides the ability to create victual HomeKit accessories.

This plugin is inspired by the following plugins:
- [homebridge-dummy](https://github.com/nfarina/homebridge-dummy), the most excellent plugin by Nick Farina
- [homebridge-random-delay-switches](https://github.com/kernie66/homebridge-random-delay-switches)
- [homebridge-fake-doorbell](https://www.npmjs.com/package/homebridge-fake-doorbell)
- [homebridge-dummy-lock-homekey](https://github.com/benov84/homebridge-dummy-lock-homekey)

The purpose of this plugin is to be able to create different types of virtual HomeKit accessories from a single plugin, rather than have to hunt down and install multiple individual plugins.

This is work in progress, so new accessories will be added as needed or requested. The first accessories offered are virtual devices that are most useful:

-   Switch. Nobody can have too many switches! Allows you to create standalone switches, switches with timers, and switches that trigger notifications.
-   Doorbell. Allows you to use any button as a doorbell and have it play a chime on a Homepod paired in the Home app.
-   Garage Door. Will display a widget in CarPlay when you approach your home. Issues a notification when the accessory's state changes.
-   Lock. This was just low hanging fruit. Issues a notification when the accessory's state changes.

## Installation

You can install this plugin via the Homebridge UI or by typing:

```
npm install -g homebridge-virtual-accessories
```

## Configuration

You can configure the plugin from the Homebridge UI, or by ediiting the JSON configuration directly in the Homebridge JSON Config editor.
In the UI, required fields will be marked with an asterist (*).

`accessoryID`, `accessoryName`, and `accessoryType` are required fields for all the accessories.

Note:
1. `accessoryID` uniquely identifies an accassory and each accessory must have a different value. If you change the value of `accessoryID` after saving the config, it will handle the change as the accessory having been deleted and a new one created. This will delete the "old" accessory in the Home app, which will then delete automations that use the deleted accessory, as well as any scenes that only use the deleted accessory.
2. `acccessoryName` is the name that will apppear on the Homekit tile for the accessory. While a unique name is not required, it is a good idea to pick different names for each accessory.

### Doorbell

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Doorbel",
            "accessoryType": "doorbell",
            "doorbellVolume": 100,
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Garage Door

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Garage Door",
            "accessoryType": "garagedoor",
            "garageDoorDefaultState": "closed",
            "accessoryIsStateful": false,
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Lock

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Lock",
            "accessoryType": "lock",
            "lockDefaultState": "unlocked",
            "accessoryIsStateful": false,
            "lockHardwareFinish": "tan",
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```
`lockHardwareFinish` sets the color of the HomeKey card in the Wallet app.

### Switch

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Switch",
            "accessoryType": "switch",
            "switchDefaultState": "off",
            "accessoryIsStateful": false,
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Switch with reset timer

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Switch",
            "accessoryType": "switch",
            "switchDefaultState": "off",
            "accessoryIsStateful": false,
            "accessoryHasResetTimer": true,
            "resetTimer": {
                "duration": 10,
                "units": "seconds",
                "isResettable": true
            }
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Switch with random reset timer

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Switch",
            "accessoryType": "switch",
            "switchDefaultState": "off",
            "accessoryIsStateful": false,
            "accessoryHasResetTimer": true,
            "resetTimer": {
                "durationIsRandom": true,
                "durationRandomMin": 5,
                "durationRandomMax": 20,
                "units": "seconds",
                "isResettable": true
            }
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Switch with companion sensor (sensor triggered on & off by switch state)

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Switch",
            "accessoryType": "switch",
            "switchDefaultState": "off",
            "accessoryIsStateful": false,
            "accessoryHasCompanionSensor": true,
            "companionSensor": {
                "name": "My Companion Sensor",
                "type": "contact"
            }
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

**Note:** Due to limitations in the current version of one of Homebridge UI's dependencies, the Homebridge UI saves additional fields to the JSON config that may not be related by the particular accessory. This does not affect the behavior of the accessory, nor does it hurt to manually remove those fields from the JSON.
The next release of the dependency used by Homebridge UI should implement the ability to make fields conditionally required and the configuration will be updated to reflect that.

## Issues

If you have problems, please feel free to open a ticket on GitHub. Please attach any log output to the a ticket, making
sure to remove any sensitive information such as WiFi passwords.

Please also feel free to open a ticket on GitHub if you have any enhancement suggestions.
