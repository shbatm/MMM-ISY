/* global Module */

/* Magic Mirror
 * Module: MMM-ISY
 *
 * By shbatm
 * MIT Licensed.
 */

Module.register("MMM-ISY", {
	defaults: {
		updateInterval: 60000,
		retryDelay: 5000,
		maxWidth: '90%',
		floorplan: 'floorplan.png',
		nodes: [],
		invertedNodes: [],
		variableMapping: [], // Format: { type: '1'/'2', id: 'varID', node: 'nodes Name', onVal: 1, offVal: 0, flash: true },
		thermostats: {},
		showDimmingLevels: false,
	},
	
	deviceListCount: 0,

	requiresVersion: "2.1.0", // Required version of MagicMirror

	deviceList: null,

	start: function() {
		var self = this;

		//Flag for check if module is loaded
		this.loaded = false;
	},

	getDom: function() {
		var self = this;

		// create element wrapper for show into the module
		var wrapper = document.createElement("div");

		if (!this.loaded) {
			wrapper.innerHTML = "Loading ISY Floorplan ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		// If this.dataRequest is not empty
		if (this.deviceList) {
			wrapper = this.generateFloorplan();
		}
		return wrapper;
	},
	
	getOpacity: function(device) {
		var opacity = 0;
		if (this.config.invertedNodes.indexOf(device.address) === -1) {
			var opacity = (this.config.showDimmingLevels) ? (device.currentState / 255.0) : (device.currentState > 0) ? 1 : 0;
		} else {
			var opacity = (this.config.showDimmingLevels) ? ((255 - device.currentState) / 255.0) : (device.currentState > 0) ? 0 : 1;
		}
		return opacity;
	},

	generateFloorplan: function() {
		var self = this;

		var outerWrapper = document.createElement("div");
		outerWrapper.className = "isyOuterWrapper";
		outerWrapper.style.cssText = "width:" + this.config.maxWidth + ";";

		var innerWrapper = document.createElement("div");
		innerWrapper.className = "isyInnerWrapper";

		var floorplan = document.createElement("img");
		floorplan.src = this.file('/img/' + this.config.floorplan);
		floorplan.className = "isyFP";
		floorplan.id = "ISYFloorPlan";
		innerWrapper.appendChild(floorplan);

		var node = null;
		for (var i = 0; i < this.deviceList.dev.length; i++) {
			node = document.createElement("img");
			node.id = "ISYNode_" + this.config.nodes[this.deviceList.dev[i].nodeId];
			node.className = "isyFP isyON";
			node.src = this.file("/img/" + this.config.nodes[this.deviceList.dev[i].nodeId].replace(/\s/g,"") + ".png");
			if (typeof this.deviceList.dev[i].currentState === "number") {
				node.style.cssText = "opacity: " + this.getOpacity(this.deviceList.dev[i]) + ";";
			}
			innerWrapper.appendChild(node);
		}
		for (i = 0; i < this.deviceList.var.length; i++) {
			node = document.createElement("img");
			var nodeName = this.config.variableMapping[this.deviceList.var[i].mapId].node;
			node.id = "ISYNode_" + nodeName;
			node.className = "isyFP isyON";
			node.src = this.file("/img/" + nodeName + ".png");
			if (this.deviceList.var[i].value === this.config.variableMapping[this.deviceList.var[i].mapId].onVal) {
				if (typeof this.config.variableMapping[this.deviceList.var[i].mapId].flash !== "undefined" &&
					this.config.variableMapping[this.deviceList.var[i].mapId].flash) {
					node.classList.add("isyFlashNode");	
				} else {
					node.style.cssText = "opacity: 1;";
				}
			}
			innerWrapper.appendChild(node);
		}
		for (var tst in this.deviceList.tst) {
			if (this.deviceList.tst[tst].address.endsWith("1")) {
				var tstat = this.generateThermostat(this.deviceList.tst[tst]);
				innerWrapper.appendChild(tstat);
			}
		}
		outerWrapper.appendChild(innerWrapper);
		return outerWrapper;
	},

	generateThermostat: function(device) {
		// Pass "undefined" to function to generate a sample DOM structure
		if (typeof device === "undefined") {
			device = {};
			device.address = "upstairs";
			device.status = { currTemp: 72, coolSetPoint: 75, heatSetPoint: 55, humidity: 55, mode: "heating"};
		}
		
		var tstatConf = this.config.thermostats[device.address.replace(/\s[0-9]$/,"")];
		
		var isyTstatWrapper = document.createElement("div");
		isyTstatWrapper.className = "isyTstatWrapper";
		isyTstatWrapper.id = "ISYNode_" + device.address + "_TSTAT";
		
		if ("showSetPoints" in tstatConf && tstatConf.showSetPoints) {
			var isyHeatSetPoint = document.createElement("div");
			isyHeatSetPoint.className = "isyHeatSetPoint";
			isyHeatSetPoint.id = "ISYNode_" + device.address + "_HSP";
			isyHeatSetPoint.innerHTML = device.status.heatSetPoint + "<sup>&deg;F</sup>";
			isyTstatWrapper.appendChild(isyHeatSetPoint);
		}

		var isyCurrTemp = document.createElement("div");
		isyCurrTemp.className = "isyCurrTemp";
		if (device.status.currentStatus == "heating") {
			isyCurrTemp.classList.add("isyHeating");
		} else if (device.status.currentStatus == "cooling") {
			isyCurrTemp.classList.add("isyCooling");
		}
		isyCurrTemp.id = "ISYNode_" + device.node + "_CT";
		isyCurrTemp.innerHTML = device.status.currTemp + "<sup>&deg;F</sup>";
		isyTstatWrapper.appendChild(isyCurrTemp);

		if ("showSetPoints" in tstatConf && tstatConf.showSetPoints) {
			var isyCoolSetPoint = document.createElement("div");
			isyCoolSetPoint.className = "isyCoolSetPoint";
			isyCoolSetPoint.id = "ISYNode_" + device.address + "_CSP";
			isyCoolSetPoint.innerHTML = device.status.coolSetPoint + "<sup>&deg;F</sup>";
			isyTstatWrapper.appendChild(isyCoolSetPoint);	
		}

		var br = document.createElement("br");
		br.style.cssText = "clear: left;";
		isyTstatWrapper.appendChild(br);

		if ("showRelHum" in tstatConf && tstatConf.showRelHum) {
			var isyHumidity = document.createElement("div");
			isyHumidity.className = "isyHumidity";
			isyHumidity.id = "ISYNode_" + device.address + "_RH";
			isyHumidity.innerHTML = device.status.humidity + "%<sup>RH</sup>";
			isyTstatWrapper.appendChild(isyHumidity);			
		}
		
		if ("position" in tstatConf) {
			isyTstatWrapper.style.cssText = tstatConf.position;
		}

		return isyTstatWrapper;
	},

	getScripts: function() {
		return [];
	},

	getStyles: function() {
		return [this.name + ".css"];
	},

	processData: function(data) {
		var self = this;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
		this.loaded = true;
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if (notification === 'DEVICE_LIST_RECEIVED') {
			this.deviceList = {};
			this.deviceList = payload;
			console.log(this.deviceList);
			this.loaded = true;
			this.updateDom();
		}
		if (notification === 'DEVICE_CHANGED') {
			console.log("Device Changed: " + payload.address);
			this.deviceList.dev.splice(payload.nodeId, 1, payload);
			node = document.getElementById("ISYNode_" + this.config.nodes[payload.nodeId]);
			if (typeof payload.currentState === "number") {
				node.style.cssText = "opacity: " + this.getOpacity(payload) + ";";
			}
		}
		if (notification === 'THERMOSTAT_CHANGED') {
			var tstat = document.getElementById("ISYNode_" + payload.address + "_TSTAT");
			var prt = tstat.parentNode;
			prt.removeChild(tstat)
			prt.appendChild(this.generateThermostat(payload));
		}
		if (notification === 'VARIABLE_CHANGED') {
			this.deviceList.var.splice(payload.mapId, 1, payload);
			
			if (payload.value === this.config.variableMapping[payload.mapId].onVal) {
				if (typeof this.config.variableMapping[payload.mapId].flash !== "undefined" &&
						this.config.variableMapping[payload.mapId].flash) {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.mapId].node).classList.add("isyFlashNode");
				} else {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.mapId].node).style.cssText = "opacity: 1;";
				}
			} else if (payload.value === this.config.variableMapping[payload.mapId].offVal) {
				if (typeof this.config.variableMapping[payload.mapId].flash !== "undefined" &&
						this.config.variableMapping[payload.mapId].flash) {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.mapId].node).classList.remove("isyFlashNode");
				} else {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.mapId].node).style.cssText = "opacity: 0;";
				}
			}
		}
	},

    notificationReceived: function (notification, payload, sender) {
    	if (notification === 'ALL_MODULES_STARTED') {
			this.sendSocketNotification("INITIALIZE_ISY", this.config);
    	}
		if (notification === 'DOM_OBJECTS_CREATED') {

		}
	}
});
