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
		variableMapping: [] // Format: { type: '1'/'2', id: 'varID', node: 'nodes Name', onVal: 1, offVal: 0, flash: true },
	},

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

		if (typeof this.deviceList !== "undefined") {
			var node = null;
			for (var i = 0; i < this.deviceList.dev.length; i++) {
				node = document.createElement("img");
				node.id = "ISYNode_" + this.config.nodes[this.deviceList.dev[i].nodeId];
				node.className = "isyFP isyON";
				node.src = this.file("/img/" + this.config.nodes[this.deviceList.dev[i].nodeId] + ".png");
				if (typeof this.deviceList.dev[i].currentState === "number") {
					node.style.cssText = "opacity: " + (this.deviceList.dev[i].currentState / 255.0);
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
					node.classList.add("isyFlashNode");
				}
				innerWrapper.appendChild(node);
			}
		}

		outerWrapper.appendChild(innerWrapper);
		return outerWrapper;
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
			this.deviceList = payload;
			console.log(this.deviceList);
			this.loaded = true;
			this.updateDom();
		}
		if (notification === 'DEVICE_CHANGED') {
			console.log(payload);
			// Do Device Update
		}
		if (notification === 'VARIABLE_CHANGED') {
			this.deviceList.var[payload.index] = payload.var;
			console.log(payload.var);

			if (payload.var.value === this.config.variableMapping[payload.var.mapId].onVal) {
				if (typeof this.config.variableMapping[payload.var.mapId].flash !== "undefined" &&
						this.config.variableMapping[payload.var.mapId].flash) {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.var.mapId].node).classList.add("isyFlashNode");
				} else {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.var.mapId].node).style.cssText = "opacity: 1;";
				}
			} else if (payload.var.value === this.config.variableMapping[payload.var.mapId].offVal) {
				if (typeof this.config.variableMapping[payload.var.mapId].flash !== "undefined" &&
						this.config.variableMapping[payload.var.mapId].flash) {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.var.mapId].node).classList.remove("isyFlashNode");
				} else {
					document.getElementById("ISYNode_" + this.config.variableMapping[payload.var.mapId].node).style.cssText = "opacity: 0;";
				}
			}
			// Do Variable mapping and update
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
