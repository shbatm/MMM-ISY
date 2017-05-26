/* Magic Mirror
 * Node Helper: MMM-ISY
 *
 * By shbatm
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var ISY = require('isy-js');

module.exports = NodeHelper.create({

	isyInitialize: function() {
		var isy = new ISY.ISY('127.0.0.1:3000', 'admin', 'password', handleChanged, true, true, true, handleVariableChanged);
		self.isy = isy;
		self.isy.initialize(handleInitialized);
		console.log('initialize completed');
	},

	handleInitialized: function() {
		self.deviceList = self.isy.getDeviceList();
	    console.log("Device count: "+ self.deviceList.length);
		if(self.deviceList === null) {
			console.log("No device list returned!");
		} else {
			console.log("Got device list. Device count: "+self.deviceList.length);
			for(var index = 0; index < self.deviceList.length; index++ ) {
				console.log("Device: "+self.deviceList[index].name+", "+self.deviceList[index].deviceType+", "+self.deviceList[index].address+", "+self.deviceList[index].deviceFriendlyName);
			}
		}
		self.sendSocketNotification("DEVICE_LIST_RECEIVED", self.deviceList);
	},

	handleChanged: function(isy, device) {
		var logMessage = 'From isy: '+isy.address+' device changed: '+device.name;
		if(device.deviceType == isy.DEVICE_TYPE_FAN) {
			logMessage += ' fan state: '+device.getCurrentFanState();
		} else if(device.deviceType == isy.DEVICE_TYPE_LIGHT) {
			logMessage += ' light state: '+device.getCurrentLightState();
		} else if(device.deviceType == isy.DEVICE_TYPE_DIMMABLE_LIGHT) {
			logMessage += ' dimmable light state: '+device.getCurrentLightState()+' dimm Level: '+device.getCurrentLightDimState();
		} else if(device.deviceType == isy.DEVICE_TYPE_LOCK || device.deviceType == isy.DEVICE_TYPE_SECURE_LOCK) {
			logMessage += ' lock state: '+device.getCurrentLockState();
		} else if(device.deviceType == isy.DEVICE_TYPE_OUTLET) {
			logMessage += ' outlet state: '+device.getCurrentOutletState();
		} else if(device.deviceType == isy.DEVICE_TYPE_ALARM_DOOR_WINDOW_SENSOR) {
			logMessage += ' door window sensor state: '+device.getCurrentDoorWindowState()+' logical: '+device.getLogicalState()+' physical: '+device.getPhysicalState();		
		} else if(device.deviceType == isy.DEVICE_TYPE_DOOR_WINDOW_SENSOR) {
			logMessage += ' door window sensor state: '+device.getCurrentDoorWindowState();
		} else if(device.deviceType == isy.DEVICE_TYPE_ALARM_PANEL) {
			logMessage += ' alarm panel state: '+device.getAlarmStatusAsText();
		} else if(device.deviceType == isy.DEVICE_TYPE_MOTION_SENSOR) {
			logMessage += ' motion sensor state: '+device.getCurrentMotionSensorState();        
		} else if(device.deviceType == isy.DEVICE_TYPE_SCENE) {
			logMessage += ' scene. light state: '+device.getCurrentLightState()+' dimm Level: '+device.getCurrentLightDimState();
	    } else {
			logMessage += ' unknown device, cannot parse state';
		}

	    console.log(logMessage);	
	    self.sendSocketNotification("DEVICE_CHANGED", device);
	},

	handleVariableChanged: function(isy, variable) {
		var logMessage = "From isy: "+isy.address+' variable changed: '+variable;

		console.log(logMessage);
		self.sendSocketNotification("VARIABLE_CHANGED", variable);
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
			console.log("Working notification system. Notification:", notification, "payload: ", payload);
			this.isyInitialize();
		} else if (notification === "REFRESH_DEVICE_LIST") {
			this.handleInitialized();
		} else {
			console.log(this.name + " socket notification recevied: " + notification);
		}
	},


});
