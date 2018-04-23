/* Magic Mirror
 * Node Helper: MMM-ISY
 *
 * NOTE: Requires isy-js, but do not attempt to pass this.deviceList or this.variableList via socket.
 * The prototypes self-reference the isy variable and this creates circular references which will 
 * cause a stack limit exception when passed to the main Module code via WebSocket.
 *
 * By shbatm
 * MIT Licensed.
 */
/* jshint node: true, esversion: 6*/

var NodeHelper = require("node_helper");
var ISY = require('isy-js');
var isyConfig = require('./isy.json');

module.exports = NodeHelper.create({
    config: null,

    devices: {},
    variables: {},
    tstats: {},
    callNo: 0,

    // Function to search a mixed array of strings and objects
    indexFind: (find, arr, name) =>
        arr.findIndex(i => {
            if ((typeof i === "string" & i === find) ||
                typeof i === "object" && name in i && i[name] === find) {
                return true;
            } else {
                return false;
            }
        }),

    isyInitialize: function() {
        that = this;
        this.isy = new ISY.ISY(isyConfig.address,
            isyConfig.username,
            isyConfig.password,
            isyConfig.elkEnabled,
            this.handleDeviceChanged.bind(that),
            isyConfig.useHttps,
            isyConfig.scenesInDeviceList,
            isyConfig.enableDebugLogging,
            this.handleVariableChanged.bind(that));
        this.isy.initialize(this.handleInitialized.bind(that));
        console.log('ISY initialization completed');
    },

    handleInitialized: function() {
        this.devices = {};
        this.variables = {};
        this.tstats = {};
        this.deviceList = this.isy.getDeviceList();
        if (this.deviceList === null) {
            console.log("No device list returned!");
        } else {
            console.log("Got device list. Device count: " + this.deviceList.length);
            for (var index = 0; index < this.deviceList.length; index++) {
                var dev = this.deviceList[index];
                if (dev.address.startsWith("n0"))
                    dev.svgId = dev.address;
                else
                    dev.svgId = "i_" + dev.address.replace(/\s+/g, '');
                // console.log("Processing " + dev.svgId + " : " + dev.address);
                if (dev.svgId.replace(/[0-9]$/, '') in this.config.thermostats) {
                    if (dev.svgId.endsWith("1")) {
                        // Thermostats are added in groups to the list so we can get the cooling/heating info too
                        this.tstats[dev.svgId] = dev;
                        delete this.tstats[dev.svgId].isy;
                        this.tstats[dev.svgId].fstatus = dev.getFormattedStatus();
                    }
                } else {
                    var clippedISYDevice = dev;
                    delete clippedISYDevice.isy; // Remove the circular reference so we can pass the object to the module
                    this.devices[clippedISYDevice.svgId] = clippedISYDevice;
                }
                if (isyConfig.enableDebugLogging)
                    console.log("Device: " + dev.name + ", " + dev.deviceType + ", " + dev.address + ", " + dev.deviceFriendlyName);
            }
        }

        this.variableList = this.isy.getVariableList();
        if (this.variableList === null) {
            console.log("No variable list returned!");
        } else {
            console.log("Got variable list. Variable Count: " + this.variableList.length);
            for (var i = 0; i < this.variableList.length; i++) {
                var isyVar = this.variableList[i];
                isyVar.svgId = "var_" + isyVar.type + "_" + isyVar.id;
                delete isyVar.isy;
                this.variables[isyVar.svgId] = isyVar;
            }
        }
        this.sendSocketNotification("DEVICE_LIST_RECEIVED", { dev: this.devices, var: this.variables, tst: this.tstats });
    },

    handleDeviceChanged: function(isy, dev) {
        if (isyConfig.enableDebugLogging) {
            var logMessage = 'From isy: ' + isy.address + ' device changed: ' + dev.name;
            logMessage += this.detailedDeviceLogMessage(dev);
            console.log(logMessage);
        }
        if (dev.address.startsWith("n0"))
            dev.svgId = dev.address;
        else
            dev.svgId = "i_" + dev.address.replace(/\s+/g, '');

        if (dev.svgId.replace(/[0-9]$/, '') in this.config.thermostats) {
            if (dev.svgId.endsWith("1")) {
                // Handle Thermostat Event
                delete dev.isy;
                dev.fstatus = dev.getFormattedStatus();
                this.tstats[dev.svgId] = dev;
                this.sendSocketNotification("THERMOSTAT_CHANGED", dev);
                return;
            } else { return; }
        }

        // Check if config has an alternate property selected to use as currentState (e.g. HarmonyHub node server uses GV3 instead of ST)
        if (dev.svgId in this.config.nodes && "useProp" in this.config.nodes[dev.svgId] && this.config.nodes[dev.svgId].useProp in dev) {
            console.log("Using " + this.config.nodes[dev.svgId].useProp + "=" + dev[this.config.nodes[dev.svgId].useProp] + " (" + typeof dev[this.config.nodes[dev.svgId].useProp] + ") as status for " + dev.name);
            dev.currentState = dev[this.config.nodes[dev.svgId].useProp];
        }

        delete dev.isy;
        // device.fstatus = getFormattedStatus();
        this.devices[dev.svgId] = dev;
        this.sendSocketNotification("DEVICE_CHANGED", dev);
    },

    handleVariableChanged: function(isy, isyVar) {
        var logMessage = `From isy: ${isy.address} variable changed: ${isyVar.type}.${isyVar.id}`;
        console.log(logMessage);

        isyVar.svgId = "var_" + isyVar.type + "_" + isyVar.id;
        delete isyVar.isy;
        this.variables[isyVar.svgId] = isyVar;
        this.sendSocketNotification("VARIABLE_CHANGED", isyVar);
    },

    handleProgramCmdResponse: function(success) {
        this.sendSocketNotification("PROGRAM_CMD_RESULT", success);
    },

    // Override socketNotificationReceived method.

    /* socketNotificationReceived(notification, payload)
     * This method is called when a socket notification arrives.
     *
     * argument notification string - The identifier of the noitication.
     * argument payload mixed - The payload of the notification.
     */
    socketNotificationReceived: function(notification, payload) {
        var that = this;
        if (notification === "INITIALIZE_ISY") {
            if (this.config === null) {
                // Initial Load of this helper.
                this.config = payload;
                this.isyInitialize();
            } else if (Object.keys(this.devices).length > 0) {
                // ISY is already initialized, just send back the data:
                this.sendSocketNotification("DEVICE_LIST_RECEIVED", { dev: this.devices, var: this.variables, tst: this.tstats });
            }
            // else be patient, already waiting for a callback.
        } else if (notification === "REFRESH_DEVICE_LIST") {
            this.handleInitialized();
        } else if (notification === "PROGRAM_CMD") {
            this.isy.runProgram(payload.id, payload.command, this.handleProgramCmdResponse.bind(that));
        } else {
            console.log(this.name + " socket notification recevied: " + notification);
        }
    },


    detailedDeviceLogMessage: function(device) {
        var logMessage = '';
        switch (device.deviceType) {
            case this.isy.DEVICE_TYPE_FAN:
                logMessage += ' fan state: ' + device.getCurrentFanState();
                break;
            case this.isy.DEVICE_TYPE_LIGHT:
                logMessage += ' light state: ' + device.getCurrentLightState();
                break;
            case this.isy.DEVICE_TYPE_DIMMABLE_LIGHT:
                logMessage += ' dimmable light state: ' + device.getCurrentLightState() + ' dimm Level: ' + device.getCurrentLightDimState();
                break;
            case this.isy.DEVICE_TYPE_LOCK:
                logMessage += ' lock state: ' + device.getCurrentLockState();
                break;
            case this.isy.DEVICE_TYPE_SECURE_LOCK:
                logMessage += ' lock state: ' + device.getCurrentLockState();
                break;
            case this.isy.DEVICE_TYPE_OUTLET:
                logMessage += ' outlet state: ' + device.getCurrentOutletState();
                break;
            case this.isy.DEVICE_TYPE_ALARM_DOOR_WINDOW_SENSOR:
                logMessage += ' door window sensor state: ' + device.getCurrentDoorWindowState() + ' logical: ' + device.getLogicalState() + ' physical: ' + device.getPhysicalState();
                break;
            case this.isy.DEVICE_TYPE_DOOR_WINDOW_SENSOR:
                logMessage += ' door window sensor state: ' + device.getCurrentDoorWindowState();
                break;
            case this.isy.DEVICE_TYPE_ALARM_PANEL:
                logMessage += ' alarm panel state: ' + device.getAlarmStatusAsText();
                break;
            case this.isy.DEVICE_TYPE_MOTION_SENSOR:
                logMessage += ' motion sensor state: ' + device.getCurrentMotionSensorState();
                break;
            case this.isy.DEVICE_TYPE_SCENE:
                logMessage += ' scene. light state: ' + device.getCurrentLightState() + ' dimm Level: ' + device.getCurrentLightDimState();
                break;
            case this.isy.DEVICE_TYPE_THERMOSTAT:
                logMessage += ' thermostat. ' + device.getFormattedStatus();
                break;
            case this.isy.DEVICE_TYPE_NODE_SERVER_NODE:
                logMessage += ' node server node.\n' + device.getFormattedStatus();
                break;
            case this.isy.DEVICE_TYPE_REMOTE:
                logMessage += ' mini remote. Nothing to report.';
                break;
            case this.isy.DEVICE_TYPE_LEAK_SENSOR:
                logMessage += ' leak sensor. ';
                break;
            default:
                logMessage += ' unknown device, cannot parse state';
        }
        return logMessage;
    },



});