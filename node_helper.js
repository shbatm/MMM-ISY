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

var NodeHelper = require("node_helper");
var ISY = require('isy-js');

module.exports = NodeHelper.create({
    config: null,

    devices: [],
    variables: [],

    isyInitialize: function() {
        that = this;

        this.isy = new ISY.ISY('127.0.0.1:3000', 'admin', 'password', false, this.handleChanged.bind(that), false, false, true, this.handleVariableChanged.bind(that));
        //this.isy = new ISY.ISY('home.timjbond.com:25000', 'admin', 'password', false, this.handleChanged, true, false, true, this.handleVariableChanged);
        this.isy.initialize(this.handleInitialized.bind(that));
        console.log('initialize completed');
    },

    handleInitialized: function() {
        this.devces = [];
        this.variables = [];
        this.deviceList = this.isy.getDeviceList();
        if(this.deviceList === null) {
            console.log("No device list returned!");
        } else {
            console.log("Got device list. Device count: "+this.deviceList.length);
            for(var index = 0; index < this.deviceList.length; index++ ) {
                if (this.config.nodes.indexOf(this.deviceList[index].address.replace(/\s/g,"")) > -1) {
                    // Filter the devices we want
                    var clippedISYDevice = this.deviceList[index];
                    delete clippedISYDevice.isy;    // Remove the circular reference so we can pass the object to the module
                    clippedISYDevice.nodeId = this.config.nodes.indexOf(this.deviceList[index].address.replace(/\s/g,""));
                    this.devices.push(clippedISYDevice);
                }
                //console.log("Device: "+this.deviceList[index].name+", "+this.deviceList[index].deviceType+", "+this.deviceList[index].address+", "+this.deviceList[index].deviceFriendlyName);
            }
        }
        
        this.variableList = this.isy.getVariableList();
        if(this.variableList === null) {
            console.log("No variable list returned!");
        } else {
            console.log("Got variable list. Variable Count: "+this.variableList.length);
            for (var i = 0; i < this.variableList.length; i++) {
                for (var v = 0; v < this.config.variableMapping.length; v++) {
                    if (this.variableList[i].type === this.config.variableMapping[v].type &&
                        this.variableList[i].id === this.config.variableMapping[v].id) {
                        var clippedISYVariable = this.variableList[i];
                        delete clippedISYVariable.isy;
                        clippedISYVariable.mapId = v;
                        this.variables.push(clippedISYVariable);
                        break;
                    }
                }
            }
            // console.log(this.variableList);
        }
        this.sendSocketNotification("DEVICE_LIST_RECEIVED", { dev: this.devices, var: this.variables });
    },

    handleChanged: function(isy, device) {
        var logMessage = 'From isy: '+isy.address+' device changed: '+device.name;

        // Check if the device is in our list
        var handleDevice = false;
        for (var i = 0; i < this.devices.length; i++) {
            if (this.devices[i].address === device.address) {
                handleDevice = true;
                break;
            }
        }
        if (!handleDevice) { return; }

        switch (device.deviceType) {
            case isy.DEVICE_TYPE_FAN:
                logMessage += ' fan state: '+device.getCurrentFanState();
                break;
            case isy.DEVICE_TYPE_LIGHT:
                logMessage += ' light state: '+device.getCurrentLightState();
                break;
            case isy.DEVICE_TYPE_DIMMABLE_LIGHT:
                logMessage += ' dimmable light state: '+device.getCurrentLightState()+' dimm Level: '+device.getCurrentLightDimState();
                break;
            case isy.DEVICE_TYPE_LOCK: 
                logMessage += ' lock state: '+device.getCurrentLockState();
                break;
            case isy.DEVICE_TYPE_SECURE_LOCK:
                logMessage += ' lock state: '+device.getCurrentLockState();
                break;
            case isy.DEVICE_TYPE_OUTLET:
                logMessage += ' outlet state: '+device.getCurrentOutletState();
                break;
            case isy.DEVICE_TYPE_ALARM_DOOR_WINDOW_SENSOR:
                logMessage += ' door window sensor state: '+device.getCurrentDoorWindowState()+' logical: '+device.getLogicalState()+' physical: '+device.getPhysicalState();       
                break;
            case isy.DEVICE_TYPE_DOOR_WINDOW_SENSOR:
                logMessage += ' door window sensor state: '+device.getCurrentDoorWindowState();
                break;
            case isy.DEVICE_TYPE_ALARM_PANEL:
                logMessage += ' alarm panel state: '+device.getAlarmStatusAsText();
                break;
            case isy.DEVICE_TYPE_MOTION_SENSOR:
                logMessage += ' motion sensor state: '+device.getCurrentMotionSensorState();        
                break;
            case isy.DEVICE_TYPE_SCENE:
                logMessage += ' scene. light state: '+device.getCurrentLightState()+' dimm Level: '+device.getCurrentLightDimState();
                break;
            default:
                logMessage += ' unknown device, cannot parse state';
        }

        console.log(logMessage);    
        this.sendSocketNotification("DEVICE_CHANGED", device);
    },

    handleVariableChanged: function(isy, variable) {
        var logMessage = "From isy: "+isy.address+' variable changed: '+variable;

        // Check if the device is in our list
        var handleVariable = false;
        for (var i = 0; i < this.variables.length; i++) {
            if (this.variables[i].id === variable.id && this.variables[i].type === variable.type) {
                var mapId = this.variables[i].mapId;
                delete variable.isy;
                variable.mapId = mapId;
                this.variables[i] = variable;
                this.sendSocketNotification("VARIABLE_CHANGED", {index: i, var: variable});
                break;
            }
        }
    },

    // Override socketNotificationReceived method.

    /* socketNotificationReceived(notification, payload)
     * This method is called when a socket notification arrives.
     *
     * argument notification string - The identifier of the noitication.
     * argument payload mixed - The payload of the notification.
     */
    socketNotificationReceived: function(notification, payload) {
        if (notification === "INITIALIZE_ISY") {
            console.log("Initializing ISY Connection...");
            this.config = payload;
            this.isyInitialize();
        } else if (notification === "REFRESH_DEVICE_LIST") {
            this.handleInitialized();
        } else {
            console.log(this.name + " socket notification recevied: " + notification);
        }
    },


});
