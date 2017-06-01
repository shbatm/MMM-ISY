# MMM-ISY

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/) to connect to an ISY device from Universal Devices. (http://www.universal-devices.com) and display a floor plan showing live updates of which Insteon or Z-Wave devices are on.

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
var config = {
    modules: [
        {
            module: 'MMM-ISY',
            position: 'middle_center',
            config: {
                // See below for configurable options
            }
        }
    ]
}
```

## Screenshots
Animated View:

![](https://raw.githubusercontent.com/shbatm/MMM-ISY/master/screenshots/floorplan_animated.gif)

Static View:

![](https://raw.githubusercontent.com/shbatm/MMM-ISY/master/screenshots/floorplan_preview.png)

Floorplan Base Layer:

![](https://raw.githubusercontent.com/shbatm/MMM-ISY/master/screenshots/floorplan.png)

Individual Device Image File:

![](https://raw.githubusercontent.com/shbatm/MMM-ISY/master/screenshots/22D8601.png) ![](https://raw.githubusercontent.com/shbatm/MMM-ISY/master/screenshots/22D8601_background.png)

## Creating the Floorplans
The floor plan works by overlaying several transparent image 'layers' on top of each other.  There is a base layer that is always shown, and then each ISY device has its own PNG file that shows nothing but the device you want to highlight (everything else on the image is transparent).  When the device is "ON" the module sets the opacity of that layer to the ON level of the device and it shows up on the floorplan.  Think of it like Photoshop layers turning on and off.

You must create your own floorplans in your favorite photo editor.  The ones in the example were created using AutoCad's `PNGOUT` command for each device and then using Photoshop to make the background transparent.

1. Use your favorite editor to create the base PNG floorplan with no devices on. Save this in the `MMM-ISY/img/` directory as `floorplan.png`
2. Next, for each device you want to show, create a transparent PNG with only the device shown. This image should be the exact same size as your floorplan image, the unused portion of the image should just be transparent.  Save this in the `MMM-ISY/img/` folder as the ISY device address (without spaces or dots) -- e.g. if the address in ISY is `'23 A4 D1 1'`, the file should be `'23A4D11.png'`.

## Installation

1. Clone the repo into your `~/MagicMirror/modules` directory
2. Run the following to install the dependencies & edit your ISY configuration
```
cd MMM-ISY
npm install
cp isy.json.example isy.json
nano isy.json
```
Note: for security reasons, the ISY settings are not stored in the MagicMirror's `config.js` file.

### Dependencies
- This module uses the [`shbatm`](https://github.com/shbatm/isy-js) fork of `rodtoll`'s [`isy-js`](https://github.com/rodtoll/isy-js) to connect to the ISY via WebSocket. This fork has been modified to include Insteon Thermostats as well as some minor bugfixes that make this module work smoother. 
- `rodtoll` also has a great [`fake-isy-994i`](https://github.com/rodtoll/fake-isy-994i/) tool which can be used for testing withouth actually connecting to your ISY and manipulating devices.

## Configuration options

| Option           | Description
|----------------- |-----------
| `nodes`        | *Required* Array of ISY Nodes for which to display updates.  This should also include the variables listed in the `variableMapping` option.<br />*Example:* `nodes: ['22 D8 60 1', '22 E5 E5 1', 'Alarm_Zone1']`
| `variableMapping`        | *Optional* Array of objects representing ISY Variables to be displayed.<br>*Example:*`variableMapping: [{ type: '2', id: '8', node: 'Alarm_Zone1', onVal: 1, offVal: 0, flash: true }]`
| &nbsp;&nbsp;&nbsp;&nbsp;`.type` | The ISY Variable Type<br />`1` for integer, `2` for state.
| &nbsp;&nbsp;&nbsp;&nbsp;`.id` | The ISY Variable ID number
| &nbsp;&nbsp;&nbsp;&nbsp;`.node` | The node name included in the `nodes` option; used for assigning the overlay image.
| &nbsp;&nbsp;&nbsp;&nbsp;`.onVal` & `.offVal` | The values to use for when to show the Variable as "On" or "Off" on the floor plan.
| &nbsp;&nbsp;&nbsp;&nbsp;`.flash: true` | *Optional* Setting this to `true` will show the device pulsing on and off. The actual animation can be changed by editing the `isyFlashNode` class in the `MMM-ISY.css` file.
| `floorplan` | *Optional* to set a custom file name for the base floorplan.<br/>*Default:* `floorplan.png`
| `invertedNodes` | *Optional* An array of `nodes` that will have their displays inverted (e.g. will show up on the floorplan when OFF and will be hidden when ON). This is useful for N.C. relays, such as a Garage Door who's sensor is "ON" when the door is closed.
| `thermostats` | *Optional* An object representing the Insteon Thermostats to display.<br />*Example:*`thermostats: {'25 17 A4': { position:'left: 44%; top: 42%; zoom: 1.5;', showRelHum: true, showSetPoints: true }}`<br />Note: only include the base Insteon address in the device address (leave of the trailing 1, 2, 3, that the ISY enumerates).
| &nbsp;&nbsp;&nbsp;&nbsp;`.position` | The CSS Style to be applied describing the position and size of the T-Stat.
| &nbsp;&nbsp;&nbsp;&nbsp;`.showRelHum` | Whether or not to show the relative humidity reported by the device.
| &nbsp;&nbsp;&nbsp;&nbsp;`.showSetPoints` | Whether or not to show the Heating and Cooling Setpoints. If `false` only the current temperature is shown.
| `showDimmingLevels` | *Optional* `boolean` - whether or not to show devices' dimming levels or just show them as ON/OFF.  If set to true, the dim level reported by the ISY will be used as the Opacity of the device's layer.

## Sample Configuration
```
{
module: 'MMM-ISY',
position: "middle_center",
config: {
    nodes: ['22 D8 60 1', '22 E5 E5 1', '22 77 CB 1', 'Alarm_Zone1'],
    variableMapping: [ 
            { type: '2', id: '8', node: 'Alarm_Zone1', onVal: 1, offVal: 0, flash: true },
            ],
    floorplan: 'floorplan.png',
    invertedNodes: ['22 77 CB 1'],
    thermostats: {'25 17 A4': { position:'left: 44%; top: 42%; zoom: 1.5;', 
                        showRelHum: true, showSetPoints: true } },
    showDimmingLevels: true,
}
},
```