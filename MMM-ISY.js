/* global Module */
/* jshint esversion: 6 */

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
        floorplan: 'floorplan.svg',
        nodes: {},
        variables: {}, // Format: "var_type_varID": { onVal: 1, offVal: 0, flash: true },
        thermostats: {},
        showDimmingLevels: false,
    },

    deviceListCount: 0,

    requiresVersion: "2.1.3", // Required version of MagicMirror

    deviceList: null,

    start: function() {
        var self = this;

        //Flag for check if module is loaded
        this.loaded = false;
        this.connected = false;
    },

    getDom: function() {
        var self = this;

        var $outerWrapper = $("<div>", {
            id: "isyOuterWrapper",
            "class": "isyOuterWrapper",
            style: "width:" + this.config.maxWidth + ";"
        }).append($("<div>", {
            id: "isyInnerWrapper",
            "class": "isyInnerWrapper dimmed light small"
        }));

        if (!this.loaded && !this.connected) {
            $outerWrapper.find("#isyInnerWrapper").append("<span>Loading ISY Floorplan ...</span>");
            // Get the floorplan graphic
            console.log("Getting floorplan graphic: " + this.config.floorplan);
            $outerWrapper.find("#isyInnerWrapper").svg({
                loadURL: self.file(self.config.floorplan),
                changeSize: true,
                onLoad: function(svg) {
                    // Remove Loading Classes and Text
                    $(this).removeClass("dimmed light small");
                    $(this).find("span").remove();
                    // Store the SVG reference for later
                    self.svg = $(this).svg('get');

                    // Get a list of all the Insteon (id=i1234561 for Insteon ID 12.34.56 1)
                    // and v5 Node Server (id=n0... for Node Server n001_node_name) nodes in the graphic
                    self.$isyNodes = $('[id^=i_],[id^=n0],[id^=var_]', self.svg.root());

                    // Get any node customizations from the config
                    self.$isyNodes.each(function(index) {
                        if ($(this)[0].id in self.config.nodes) {
                            self.$isyNodes[index].isyConfig = self.config.nodes[$(this)[0].id];
                        }
                        if ($(this)[0].id in self.config.variables) {
                            self.$isyNodes[index].isyConfig = self.config.variables[$(this)[0].id];
                        }
                    });
                }
            });
        }
        return $outerWrapper[0];
    },

    initialFloorplanUpdate: function() {
        var self = this;
        this.$isyNodes.each(function(index) {
            // Handle Devices
            if ($(this)[0].id in self.deviceList.dev) {
                // Device was found in device list.
                self.updateDevice(self.deviceList.dev[$(this)[0].id], "dev", true, $(this));
            }
            // Handle Insteon Thermostats
            if ($(this)[0].id in self.deviceList.tst) {
                // console.log("Thermostat " + $(this)[0].id + " found.");
                self.updateThermostat(self.deviceList.tst[$(this)[0].id]);
            }
            // Handle Variables
            if ($(this)[0].id in self.deviceList.var) {
                // Variable was found in the variable list.
                self.updateDevice(self.deviceList.var[$(this)[0].id], "var", true, $(this));
            }
        });
    },

    updateThermostat: function(tstat) {
        console.log(tstat);
        $(`#${tstat.svgId}_CT`, this.svg.root()).text(tstat.fstatus.currTemp);
        if (this.config.thermostats[tstat.svgId.replace(/[0-9]$/, "")].showSetPoints) {
            $(`#${tstat.svgId}_CSP`, this.svg.root()).text(tstat.fstatus.coolSetPoint);
            $(`#${tstat.svgId}_HSP`, this.svg.root()).text(tstat.fstatus.heatSetPoint);
            $(`#${tstat.svgId}_RH`, this.svg.root()).text(tstat.fstatus.humidity);
        } else {
            $(`#${tstat.svgId}_setpoints`, this.svg.root()).hide();
        }
        $(`#${tstat.svgId}_ST`, this.svg.root()).removeClass("cooling heating off").addClass(tstat.fstatus.currentStatus);
    },

    updateDevice: function(payload, kind, initial = false, $dev = undefined) {
        if (!initial) {
            $dev = $(`#${payload.svgId}`, this.svg.root());
            if ($dev.length === 0) { return; }
        }

        var dev = $dev[0];
        var list;

        if (kind === "dev") {
            // console.log("MMM-ISY Tracked Device Changed: " + payload.svgId);
        } else if (kind === "var") {
            // console.log("MMM-ISY Tracked Variable Changed: " + payload.svgId);
            payload.currentState = payload.value;
        } else {
            return;
        }

        if (typeof dev.isyConfig === 'object') {
            // This device has special configuration options
            if ("onVal" in dev.isyConfig && payload.currentState == dev.isyConfig.onVal) {
                if ("flash" in dev.isyConfig && dev.isyConfig.flash) {
                    $dev.addClass("isyFlashNode");
                }
                $dev.removeClass("isyOFF").addClass("isyON");
                if (!initial && "notifyOn" in dev.isyConfig) {
                    this.sendNotification(dev.isyConfig.notifyOn.notification, dev.isyConfig.notifyOn.payload);
                }
                return;
            } else if ("offVal" in dev.isyConfig && payload.currentState == dev.isyConfig.offVal) {
                if ("flash" in dev.isyConfig && dev.isyConfig.flash) {
                    $dev.removeClass("isyFlashNode");
                }
                $dev.removeClass("isyON").addClass("isyOFF");
                if (!initial && "notifyOff" in dev.isyConfig) {
                    this.sendNotification(dev.isyConfig.notifyOff.notification, dev.isyConfig.notifyOff.payload);
                }
                return;
            } else if ("inverted" in dev.isyConfig && dev.isyConfig.inverted) {
                if (payload.currentState === 0) {
                    $dev.removeClass("isyOFF").addClass("isyON");
                } else if (payload.currentState > 0) {
                    $dev.removeClass("isyON").addClass("isyOFF");
                }
                return;
            }
        }
        // Still here, so the status has not been set yet:
        if (typeof payload.currentState === "number") {
            if (payload.currentState > 0) {
                $dev.removeClass("isyOFF").addClass("isyON");
            } else {
                $dev.removeClass("isyON").addClass("isyOFF");
            }
        }
        return;
    },

    getScripts: function() {
        return ['jquery.min.js', 'jquery.svg.min.js', 'jquery.svganim.min.js', 'jquery.svgdom.min.js'];
    },

    getStyles: function() {
        return [this.name + ".css", 'jquery.svg.css'];
    },

    // socketNotificationReceived from helper
    socketNotificationReceived: function(notification, payload) {
        var self = this;
        console.log("MMM-ISY received notification: " + notification);
        if (notification === 'DEVICE_LIST_RECEIVED') {
            this.deviceList = {};
            this.deviceList = payload;
            this.connected = true;
            this.initialFloorplanUpdate();
        }
        if (notification === 'DEVICE_CHANGED') {
            this.deviceList.dev[payload.svgId] = payload;
            this.updateDevice(payload, "dev");
        }

        if (notification === 'THERMOSTAT_CHANGED') {
            this.deviceList.tst[payload.svgId] = payload;
            // Handle Insteon Thermostats
            this.updateThermostat(payload);
        }

        if (notification === 'VARIABLE_CHANGED') {
            this.deviceList.var[payload.svgId] = payload;
            this.updateDevice(payload, "var");
        }
        if (notification === 'PROGRAM_CMD_RESULT') {
            if (!payload) {
                this.sendNotification("SHOW_ALERT", {
                    title: "ISY Alert",
                    message: `ISY Program Command Unsucceessful!`,
                    imageFA: "bell-slash",
                    timer: 2000,
                });
            }
        }
    },

    notificationReceived: function(notification, payload, sender) {
        if (notification === 'ALL_MODULES_STARTED') {

        }
        if (notification === 'DOM_OBJECTS_CREATED') {
            this.sendSocketNotification("INITIALIZE_ISY", this.config);
        }
        if (notification === 'ISY_PROGRAM_CMD') {
            this.sendSocketNotification("PROGRAM_CMD", payload);
            // Payload structure: { id: 'pgmID', command: 'cmd'}
            // Possible values for cmd: run|runThen|runElse|stop|enable|disable|enableRunAtStartup|disableRunAtStartup
        }
    }
});
