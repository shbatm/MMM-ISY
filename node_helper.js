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

    devices: [],
    variables: [],
    tstats: [],
    callNo: 0,

    isyInitialize: function() {
        that = this;
        this.isy = new ISY.ISY(isyConfig.address, 
								isyConfig.username, 
								isyConfig.password, 
								isyConfig.elkEnabled, 
								this.handleChanged.bind(that), 
								isyConfig.useHttps,
								isyConfig.scenesInDeviceList, 
								isyConfig.enableDebugLogging, 
								this.handleVariableChanged.bind(that));
        this.isy.initialize(this.handleInitialized.bind(that));
        console.log('ISY initialization completed');
    },

    handleInitialized: function() {
        this.devices.length = 0;
        this.variables.length = 0;
        this.tstats = {};
        this.deviceList = this.isy.getDeviceList();
        if(this.deviceList === null) {
            console.log("No device list returned!");
        } else {
            console.log("Got device list. Device count: "+this.deviceList.length);
            for (var index = 0; index < this.deviceList.length; index++ ) {
                if (this.config.nodes.indexOf(this.deviceList[index].address) > -1) {
                    // Filter the devices we want
                    var clippedISYDevice = this.deviceList[index];
                    delete clippedISYDevice.isy;    // Remove the circular reference so we can pass the object to the module
                    clippedISYDevice.nodeId = this.config.nodes.indexOf(this.deviceList[index].address);
                    this.devices.push(clippedISYDevice);
                } else if (this.deviceList[index].address.replace(/\s[0-9]$/,'') in this.config.thermostats) {
					if (this.deviceList[index].address.endsWith("1")) {
						// Thermostats are added in groups to the list so we can get the cooling/heating info too
						this.tstats[this.deviceList[index].address] = this.deviceList[index];
						delete this.tstats[this.deviceList[index].address].isy;
						this.tstats[this.deviceList[index].address].status = this.deviceList[index].getFormattedStatus();
					}
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
				var localVar = this.config.variableMapping.find(x => (x.type === this.variableList[i].type && x.id === this.variableList[i].id));
				
				if (typeof localVar === "undefined") { continue; }
				
				var clippedISYVariable = this.variableList[i];
                delete clippedISYVariable.isy;
                clippedISYVariable.mapId = this.config.variableMapping.indexOf(localVar);
                this.variables.push(clippedISYVariable);
            }
            // console.log(this.variableList);
        }
        this.sendSocketNotification("DEVICE_LIST_RECEIVED", { dev: this.devices, var: this.variables, tst: this.tstats });
    },

    handleChanged: function(isy, device) {
        var logMessage = 'From isy: '+isy.address+' device changed: '+device.name;
		//logMessage += this.detailedDeviceLogMessage(device);
        console.log(logMessage); 
        
        // Check if the device is in our list
        var localDev = this.devices.find(x => x.address === device.address);
        
        if (typeof localDev === "undefined") { 
			if (device.address in this.tstats) {
				if (device.address.endsWith("1")) {
					// Handle Thermostat Event
					delete device.isy;
					this.tstats[device.address] = device;
					this.tstats[device.address].status = device.getFormattedStatus();
					this.sendSocketNotification("THERMOSTAT_CHANGED", device);
					return;
				} else { return; }
			} else { return; }
		}
		
		delete device.isy;
		console.log(device);
		device.nodeId = localDev.nodeId;
		this.devices.splice(this.devices.indexOf(localDev), 1, device);
        this.sendSocketNotification("DEVICE_CHANGED", device);
    },

    handleVariableChanged: function(isy, variable) {
        var logMessage = "From isy: "+isy.address+' variable changed: '+variable;
		console.log(logMessage);

        // Check if the device is in our list
		var localVar = this.variables.find(x => (x.type === variable.type && x.id === variable.id));

		if (typeof localVar === "undefined") { return; }
		delete variable.isy;
        variable.mapId = localVar.mapId;
		this.variables.splice(this.variables.indexOf(localVar), 1, variable);
		this.sendSocketNotification("VARIABLE_CHANGED", variable);
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
    
        
    detailedDeviceLogMessage: function(device) {
		var logMessage = '';
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
            case isy.DEVICE_TYPE_THERMOSTAT:
				logMessage += ' thermostat. ' + device.getFormattedStatus();
				break;
            default:
                logMessage += ' unknown device, cannot parse state';
        }
        return logMessage;
	},



});
