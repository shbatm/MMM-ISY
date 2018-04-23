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

## Creating the Floorplans
The floor plan is an SVG (Scalable Vector Graphics) image which the module uses to link back to ISY Devices, Variables, & Programs(*future*).

You create an SVG file and add shapes/images/icons to represent your ISY Nodes/Variables. As long as the ids match up (see requirements below), your SVG comes to life and displays your entities' states in real time.  If you're not familiar with SVG, it is a vector image in XML format, which allows a browser to interact with individual paths and shapes inside the file.

### Naming Conventions and Tag Requirements
* You must create your own floor plan in your favorite SVG editor, such as Inkscape (Free, Open-source) or Adobe Illustrator, and save it in the module directory as `floorplan.svg`.  See `floorplan.svg.example` for an example.
* Main SVG tag must include the following attributes:
    ```xml
    <svg ...
    height="100%"
    width="100%"
    viewBox="0 0 1024 418"
    class="isyFP"
    preserveAspectRatio="xMaxYMax"
    id="ISYFloorPlan"
    ...>
    ```
    *Note:* The `viewBox` attribute can be any size, it just must be present or the image will not scale in the browser. Here it's set to the unscaled dimension of the image.
* IDs for ISY entities:
    - Insteon Devices: 
        + ID must be of the form: `i_12AB561` where the ISY Address for the device is `12 AB 56 1`. Omit leading zeros from Insteon Addresses where required (just like ISY does). For example, if the actual Insteon Address is `AB.01.45`, ISY will report it as `AB 1 45 1` and the SVG the ID should be `i_AB1451`. 
    - Insteon Thermostats:
        + Recommendation is to copy the template from the bottom of `floorplan.svg.example` and modify the graphics to suit your needs. Replace the first part of the tags with your thermostat's address, but the ids tails need to remain the same to update.
            * Thermostat Group: `i_12AB561` -- same as above.
            * Current Temperature: `i_12AB561_CT`
            * Heat Set Point: `i_12AB561_HSP`
            * Cool Set Point: `i_12AB561_CSP`
            * Current Status: `i_12AB561_ST` -- Use CSS classes to customize the look for each status. The module will add a class with the name of the current status. In the example, the outer ring will turn blue when the unit is "cooling" and red when the unit is "heating" or white for "off".
            * Relative Humidity: `i_12AB561_RH`
    - ISYv5 Node Server Nodes:
        + ID must be the same as the node name in ISY: e.g. `n001_dsc1_z02`. The module will look for any SVG tags that start with `n0` for these nodes.
    - Variables:
        + ID must be of the form: `var_TYPE_ID`. TYPE is the varable type in ISY, 1=INT, 2=STATE. ID is the variable ID from ISY. For ISY State Variable #46, the SVG ID would be: `var_2_46`.
    - Programs: *(future)*
        + ID must be of the form: `prog_PROGID` where PROGID is the ISY program ID; e.g. `prog_00A1`.
* Use Unique IDs: 
    - All SVG IDs should be unique. If you have multiple elements in your SVG for one device (e.g. 4 circles to represent 4 lights on 1 switch), the paths should be combined into 1, or the elements should be grouped together (in Inkscape use <key>Ctrl+K</key> to combine paths or <key>Ctrl+G</key> to create a group--the proper ID label should be placed on the group tag).
* Add CSS Classes:
    - The module uses CSS classes "isyON" and "isyOFF" to toggle devices ON and OFF.
    - In the SVG, each entity should be how you want it to look when "OFF".
    - Add the class "isyOFF" to each entity (e.g.`<circle class="light isyOFF">`.
    - You can customize what "ON" and "OFF" looks like for different devices or device types by customizing the CSS. The example above added a class "light" to the tag, so in the CSS, a custom `.light.isyON { }` can be used to specify what "ON" looks like for type "light". Place any CSS customizations in `~/MagicMirror/css/custom.css`.

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
| `nodes`        | *Optional* Array of ISY Nodes customizations. By default, you do not need to provide a list of nodes in the config. As long as the elements in your `floorplan.svg` are tagged properly, they will automatically be updated. This setting is used to provide advanced node properties. See Advanced Properties below.
| `variables`        | *Optional* Array of ISY Variable customizations, similar to `nodes` above.
| `floorplan` | *Optional* to set a custom file name for the base floorplan.<br/>*Default:* `floorplan.svg`
| `thermostats` | *Optional* An object representing the Insteon Thermostats to display.<br />*Example:*`thermostats: {'i_2517A4': { position: { left: 44%, top: 42%, zoom: 1.5 }', showRelHum: true, showSetPoints: true }}`<br />Note: only include the base Insteon address in the device address (leave of the trailing 1, 2, 3, that the ISY enumerates).
| `.position` | The CSS Style to be applied describing the position and size of the T-Stat.
| `.showRelHum` | Whether or not to show the relative humidity reported by the device.
| `.showSetPoints` | Whether or not to show the Heating and Cooling Setpoints. If `false` only the current temperature is shown.
| `showDimmingLevels` | *Optional* `boolean` - whether or not to show devices' dimming levels or just show them as ON/OFF.  If set to true, the dim level reported by the ISY will be used as the Opacity of the device's layer.

### Advanced Properties

Advanced Properties can be set for individual nodes and variables, which lets you customize how they behave, such as setting custom On and Off values, inverting On and Off, or even performing an action when the device/variable changes by sending a module notification.

#### Example Advanced Properties for `config.nodes`

This example customizes the `n001_dsc1_z02` element, which in this case is the motion sensor for the Alarm.  Instead of just turning "ON" it flashes the element on the floor plan. It also sends a notification to the MMM-OnScreenMenu module to turn on the monitor when motion is detected and turn it off when it clears.

```js
nodes: {
    'n001_dsc1_z02': {
        onVal: 1,
        offVal: 0,
        flash: true,
        notifyOn: {
            notification: "ONSCREENMENU_PROCESS_ACTION",
            payload: 'monitorOn'
        },
        notifyOff: {
            notification: "ONSCREENMENU_PROCESS_ACTION",
            payload: 'monitorOff'
        }
    }
}
```

| Option           | Description
|----------------- |-----------
| `onVal` & `offVal` | The values to use for when to show the Variable as "On" or "Off" on the floor plan.
| `inverted: true` | Invert the normal ON and OFF states (e.g. Garage Door sensor). Cannot be used with `flash` use `onVal: 0, offVal: 1` if you want to flash an inverted node.
| `flash: true` | *Optional* Setting this to `true` will show the device pulsing on and off. The actual animation can be changed by overriding the `isyFlashNode` class in the `MMM-ISY.css` file.
| `notifyOn` & `notifyOff` | *Optional* To send a module notification when a variable changes, add one or both of these.<br>Format: `{ notification: "NOTIFICATION_TEXT", payload: "payload to send" }`
| `useProp` | *Optional* Add to use a property other than `ST` for the devices' Current State (e.g. `GV3`). See CHANGELOG v1.0.5 for details.

## Sample Configuration
```js
{
    module: 'MMM-ISY',
    position: "middle_center",
    header: "House Status",
    config: {
        nodes: {
            'n001_dsc1_z02': {
                onVal: 1,
                offVal: 0,
                flash: true,
                notifyOn: {
                    notification: "ONSCREENMENU_PROCESS_ACTION",
                    payload: 'monitorOn'
                },
                notifyOff: {
                    notification: "ONSCREENMENU_PROCESS_ACTION",
                    payload: {
                        actionName: "delayed1",
                        action: "monitorOff",
                        delay: 60000,
                    }
                }
            },
            "i_2277CB1": { inverted: true },
            "n007_h1509751175b7e": { useProp: "GV3", offVal: 0 }
        },
        variables: { 
            "var_2_48": { onVal: 1, offVal: 0 }
        },
        thermostats: {
            'i_2517A4': { position: {left: '42%', top: '30%' }, showRelHum: true, showSetPoints: true },
            'i_251A84': { position: {left: '73%', top: '21%' }, showRelHum: false, showSetPoints: true }
        },
    }
},
```

## Inspiration and Credits

* Use of SVG format inspired by: [Home Assistant-HA-Floorplan Plugin](https://github.com/pkozul/ha-floorplan)