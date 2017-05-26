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
		maxWidth: '75%',
		floorplan: 'img/floorplan.png',
		nodes: [],
		variableMapping: [] // Format: { type: 1/2, id: varID, node: 'nodes Name', onVal: 1, offVal: 0 },
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	deviceList: null,

	start: function() {
		var self = this;

		//Flag for check if module is loaded
		this.loaded = false;

		// Schedule update timer.
/*		this.getData();
		setInterval(function() {
			self.updateDom();
		}, this.config.updateInterval);*/
	},

	/*
	 * getData
	 * function example return data and show it in the module wrapper
	 * get a URL request
	 *
	 */
/*	getData: function() {
		var self = this;

		var urlApi = "https://jsonplaceholder.typicode.com/posts/1";
		var retry = true;

		var dataRequest = new XMLHttpRequest();
		dataRequest.open("GET", urlApi, true);
		dataRequest.onreadystatechange = function() {
			console.log(this.readyState);
			if (this.readyState === 4) {
				console.log(this.status);
				if (this.status === 200) {
					self.processData(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);
					Log.error(self.name, this.status);
					retry = false;
				} else {
					Log.error(self.name, "Could not load data.");
				}
				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		dataRequest.send();
	},
*/

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update.
	 *  If empty, this.config.updateInterval is used.
	 */
/*	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad ;
		var self = this;
		setTimeout(function() {
			self.getData();
		}, nextLoad);
	},
*/
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
			wrapper = generateFloorplan();
		}
		return wrapper;
	},

	generateFloorplan: function() {
		var self = this;

		var outerWrapper = document.createElement("div");
		outerWrapper.className = "isyOuterWrapper";

		var innerWrapper = document.createElement("div");
		innerWrapper.className = "isyInnerWrapper";

		var floorplan = document.createElement("img");
		floorplan.src = this.config.floorplan;
		floorplan.className = "isyFP";
		floorplan.id = "ISYFloorPlan";
		innerWrapper.appendChild(floorplan);

		for (var i = 0; i < this.config.nodes.length; i++) {
			var node = document.createElement("img");
			node.id = "ISYNode_" + this.config.nodes[i];
			node.className = "isyFP isyON";
			node.src = "img/" + this.config.nodes[i] + ".png";
			innerWrapper.appendChild(node);
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
			// Do Device Update
		}
		if (notification === 'VARIABLE_CHANGED') {
			// Do Variable mapping and update
		}
	},

    notificationReceived: function (notification, payload, sender) {
    	if (notification === 'ALL_MODULES_STARTED') {
			this.sendSocketNotification("INITIALIZE_ISY");
    	}
		if (notification === 'DOM_OBJECTS_CREATED') {

		}
	}
});
