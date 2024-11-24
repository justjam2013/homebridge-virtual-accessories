<div>
    <a href="https://www.npmjs.com/package/homebridge-virtual-accessories"><img src="https://img.shields.io/github/package-json/v/justjam2013/homebridge-virtual-accessories?color=F99211"></a>
</div>

<div>
    <a href="https://github.com/homebridge/homebridge"><img src="https://img.shields.io/badge/_homebridge_-_verification_pending_-BAD5F3"></a>
</div>

<div>
    <a href="https://github.com/justjam2013/homebridge-virtual-accessories"><img src="https://img.shields.io/badge/_homebridge_v2.0_-_ready_-4CAF50"></a>
</div>

<div>
    <a href="https://discord.gg/Z8jmyvb"><img src="https://img.shields.io/badge/_discord (homebridge)_-737CF8"></a>
</div>

<p></p>
<p align="center" vertical-align="middle">
    <a href="https://github.com/justjam2013/homebridge-virtual-accessories"><img src="VirtualAccessories.png" height="140"></a>
    <a href="https://github.com/homebridge/homebridge"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="140"></a>
</p>

<span align="center">

# Virtual Accessories For Homebridge

</span>

#### Virtual Accessories For Homebridge is a plugin for Homebridge that provides the ability to create virtual HomeKit accessories.

This plugin is inspired by Nick Farina's most excellent [homebridge-dummy](https://github.com/nfarina/homebridge-dummy) plugin and [homebridge-random-delay-switches](https://github.com/kernie66/homebridge-random-delay-switches), as well as a few others.

The purpose of this plugin is to be able to create different types of virtual HomeKit accessories from a single plugin, rather than have to hunt down and install multiple individual plugins, some of which may be unmaintained and abandoned. Also, this plugin is Homebridge 2.0 ready.

This is work in progress, so new accessories and functionality will be added as needed or, more likely, as requested. The first accessories offered are virtual devices that are most useful:

-   Switch. Nobody can have too many switches! Allows you to create plain old switches, normally on/off switches, stateful switches, switches with set or random timers, and switches with companion sensors to trigger HomeKit notifications.
-   Doorbell. Allows you to use any button as a doorbell and have it play a chime on a Homepod.
-   Garage Door. Will display a widget in CarPlay when you approach your home. Generates a HomeKit notification when the accessory's state changes.
-   Lock. This was just low hanging fruit. Generates a HomeKit notification when the accessory's state changes. And it generates a HomeKey card in the Wallet app.
-   Window Covering - Blinds, Shades.
-   Sensor. Allows you to create different types of sensors. Sensors will generate notifications when their state changes, if configured in the Home app. Some types of notifications classified as `critical` by Homekit are allowed to bypass Do Not Disturb and allowed to appear in CarPlay. Sensors can be activated by different triggers. Currently, they options are:
    - Host Ping trigger. Pings a network host and is actvated when ping fails afer 3 attempts. The sensor resets when ping is successful.
    - Cron trigger. Activates the sensor when the time and date match the schedule deascribed by the cron expression. The sensor resets after a brief delay.
    - Switch trigger. To activate a sensor with a switch flip, create a switch with a companion sensor. A future release may provide the ability to create this pairing as a sensor with a switch trigger.

## Installation

You can install this plugin via the Homebridge UI or by typing:

```
npm install -g homebridge-virtual-accessories
```
**Note:** Virtual Accessories For Homebridge has dependencies on platform native libraries, specifically `node-gyp`, which gets compiled for that platform at installation time. Therefore you will need to make sure that the platform you are installing this plugin on has the necessary build tools available. If you are choosing to install on a platform other than the official Homebridge Docker image, I will assume that you have the necessary technical skills to do so. Below are platform specific installation notes, which I will try to update as users of this plugin report issues:

#### MacOS
If you are installing Virtual Accessories For Homebridge in a Homebridge instance running on macOS, you will need to ensure that Xcode or the Xcode Command Line Tools are installed. To install Xcode or the Xcode Command Line Tools, use the following command:
```
xcode-select --install
```
If you're having issues installing the plugin, please look at the details in this ticket: "[Cannot install (macOS)](https://github.com/justjam2013/homebridge-virtual-accessories/issues/31)".

#### Synology
If you are installing Virtual Accessories For Homebridge in a Homebridge instance running on Synology, you will need to ensure that a build toolchain is imstalled. This document provides steps for installing the Entware toolchain and other needed packages: [DSM 7: Enable Compiling Of Native Modules](https://github.com/homebridge/homebridge-syno-spk/wiki/DSM-7:-Enable-Compiling-Of-Native-Modules).

## Configuration

You can configure the plugin from the Homebridge UI, or by ediiting the JSON configuration directly in the Homebridge JSON Config editor.
In the UI, required fields will be marked with an asterisk (*).

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

### Window Covering - Blinds, Shades

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Blinds",
            "accessoryType": "windowcovering",
            "windowCoveringDefaultState": "closed",
            "accessoryIsStateful": false,
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

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

### Sensor with ping trigger

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "12345",
            "accessoryName": "My Ping Sensor",
            "accessoryType": "sensor",
            "sensorType": "contact",
            "sensorTrigger": "ping",
            "pingTrigger": {
                "host": "192.168.0.200",
                "failureRetryCount": 3,
                "isDisabled": false
            }
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Sensor with cron trigger

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "7878778",
            "accessoryName": "Cron Sensor",
            "accessoryType": "sensor",
            "sensorType": "leak",
            "sensorTrigger": "cron",
            "cronTrigger": {
                "pattern": "* * * * * *",
                "zoneId": "America/Los_Angeles",
                "isDisabled": false
            }
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

### Sensor with cron trigger with start and end datetimes

```json
{
    "name": "Virtual Accessories Platform",
    "devices": [
        {
            "accessoryID": "7878778",
            "accessoryName": "Cron Sensor",
            "accessoryType": "sensor",
            "sensorType": "leak",
            "sensorTrigger": "cron",
            "cronTrigger": {
                "pattern": "* * * * * *",
                "zoneId": "America/Los_Angeles",
                "startDateTime": "2024-11-14T19:41:00Z",
                "endDateTime": "2024-11-30T19:41:00Z",
                "isDisabled": false
            }
        }
    ],
    "platform": "VirtualAccessoriesForHomebridge"
}
```

**Note:** Due to limitations in the current version of one of Homebridge UI's dependencies, the Homebridge UI may save additional fields to the JSON config that may not be relevant by the particular accessory. The JSON config for each individual accessory is validated on startup and extranous fields are ignored. In a future release, the startup validation may cleanup the config. However this does not affect the behavior of the accessory, nor does it hurt to manually remove those fields from the JSON config.

## Known Issues

-   When creating a Cron Trigger, the date-time is saved properly, but upon editing is not displayed back. This is a UI bug with an open ticket. If you check the JSON config, you will see that the date-time values are saved correctly.
-   The Homebridge UI does not support expanding and collapsing accessory sections, so if you have a lot of accessories, it's going to require a lot of scrolling. An enhancement request has been opened here: ["Homebridge UI improvements"](https://github.com/justjam2013/homebridge-virtual-accessories/issues/32). Please read the details and provide your support for this enhancement to the Homebridge UI functionality.

## What if I run into a problem?

If you encounter a problem, please open a ticket on GitHub. Please attach any log output to the a ticket, making sure to remove any sensitive information such as passwords, tokens, etc.

Also please feel free to open a ticket if you have any enhancement suggestions or any additional functionality that you would like to see added.
