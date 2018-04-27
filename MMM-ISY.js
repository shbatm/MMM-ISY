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
        maxWidth: '98%',
        floorplan: 'floorplan.svg',
        nodes: {},
        variables: {}, // Format: "var_type_varID": { onVal: 1, offVal: 0, flash: true },
        thermostats: {},
        enableControls: false
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
            "class": "isyOuterWrapper bootstrap",
            style: "width:" + this.config.maxWidth + ";"
        }).append($("<div>", {
            id: "isyInnerWrapper",
            "class": "isyInnerWrapper dimmed light small"
        }));

        if (!this.loaded && !this.connected) {
            $outerWrapper.find("#isyInnerWrapper").append("<span id='loadingText'>Loading ISY Floorplan ...</span>").append(this.controlTemplates.loading);

            // Get the floorplan graphic
            console.log("Getting floorplan graphic: " + this.config.floorplan);
            $outerWrapper.find("#isyInnerWrapper").svg({
                loadURL: self.file(self.config.floorplan),
                changeSize: true,
                onLoad: function(svg) {
                    // Remove Loading Classes and Text
                    $(this).removeClass("dimmed light small");
                    $(this).find("#loadingText").remove();
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
                self.updateThermostat(self.deviceList.tst[$(this)[0].id], true, $(this));
            }
            // Handle Variables
            if ($(this)[0].id in self.deviceList.var) {
                // Variable was found in the variable list.
                self.updateDevice(self.deviceList.var[$(this)[0].id], "var", true, $(this));
            }
        });
    },

    updateThermostat: function(tstat, initial = false, $dev = undefined) {
        var that = this;
        if (!initial) {
            $dev = $(`#${tstat.svgId}`, this.svg.root());
            if ($dev.length === 0) { return; }
        }
        var dev = $dev[0];

        // Tag the device with the ISY information for use later
        dev.isyNode = tstat;
        dev.isyKind = "tstat";

        $(`#${tstat.svgId}_CT`, this.svg.root()).text(tstat.fstatus.currTemp);
        if (this.config.thermostats[tstat.svgId.replace(/[0-9]$/, "")].showSetPoints) {
            $(`#${tstat.svgId}_CSP`, this.svg.root()).text(tstat.fstatus.coolSetPoint);
            $(`#${tstat.svgId}_HSP`, this.svg.root()).text(tstat.fstatus.heatSetPoint);
            $(`#${tstat.svgId}_RH`, this.svg.root()).text(tstat.fstatus.humidity);
        } else {
            $(`#${tstat.svgId}_setpoints`, this.svg.root()).hide();
        }
        $(`#${tstat.svgId}_ST`, this.svg.root()).removeClass("Cooling Heating Idle").addClass(tstat.fstatus.currentStatus);
    },

    updateDevice: function(payload, kind, initial = false, $dev = undefined) {
        var that = this;
        if (!initial) {
            $dev = $(`#${payload.svgId}`, this.svg.root());
            if ($dev.length === 0) { return; }
        }
        var dev = $dev[0];

        if (kind === "dev") {
            // console.log("MMM-ISY Tracked Device Changed: " + payload.svgId);
        } else if (kind === "var") {
            // console.log("MMM-ISY Tracked Variable Changed: " + payload.svgId);
            payload.currentState = payload.value;
        } else {
            return;
        }

        var toCamelCase = (str) => (/[-_\s]/.test(str)) ? (str.toLowerCase().replace(/[\b_-](\w)/g, (m, p1, i) => p1.toUpperCase())) : str;

        // Tag the device with the ISY information for use later
        dev.isyNode = payload;
        dev.isyKind = kind;

        if (initial && this.config.enableControls) {
            // $dev.click(this.deviceClicked);
            var ctrlTemplate;
            if ("deviceType" in dev.isyNode) {
                if (dev.isyNode.deviceType === "nodeServerNode" && toCamelCase(dev.isyNode.nodeDefId) in this.controlTemplates) {
                    ctrlTemplate = this.controlTemplates[toCamelCase(dev.isyNode.nodeDefId)];
                } else if (toCamelCase(dev.isyNode.deviceType) in this.controlTemplates) {
                    ctrlTemplate = this.controlTemplates[toCamelCase(dev.isyNode.deviceType)];
                }
            }

            if (typeof ctrlTemplate !== "undefined") {
                $dev.popover({
                    html: true,
                    title: function() {
                        var template = `<span id="popover-title" class="white-text">${dev.isyNode.name}</span>
                            <button type="button" class="close" id="btnClose" data-dismiss="modal" aria-label="Close"><span aria-hidden="true" class="white-text">&times;</span></button>`;
                        return template;
                    },
                    content: ctrlTemplate,
                    container: "#isyInnerWrapper",
                    placement: "auto"
                }).on('inserted.bs.popover', function(evt) {
                    var $popup = $('#' + $(evt.target).attr('aria-describedby'));
                    // var $popup = $(this).next('.popover');
                    $popup.find('button').click(function(e) {
                        $popup.popover('hide');
                        if (this.id !== "btnClose") { that.handleControlEvent(evt.target, this.id) };
                    });
                    $popup.find('#brightness').ionRangeSlider({
                        min: 0,
                        max: 100,
                        from: Math.round(dev.isyNode.currentState / 255.0 * 100),
                        hide_min_max: true,
                        postfix: "%",
                        scope: evt,
                        onFinish: function(data) {
                            that.handleControlEventWithDebounce(this.target, data.from, 500);
                        }
                    });
                });
            }
        }

        if (typeof dev.isyConfig === 'object') {
            // This device has special configuration options
            if ("customStatusText" in dev.isyConfig && payload.currentState in dev.isyConfig.customStatusText) {
                $dev_text = $(`#${payload.svgId}_tspan`, this.svg.root());
                if ($dev_text.length !== 0) {
                    $dev_text.text(dev.isyConfig.customStatusText[payload.currentState]);
                    if (("offVal" in dev.isyConfig && payload.currentState == dev.isyConfig.offVal) || payload.currentState === 0) {
                        $dev_text.removeClass("isyON").addClass("isyOFF");
                    } else if (("onVal" in dev.isyConfig && payload.currentState == dev.isyConfig.onVal) || payload.currentState > 0) {
                        $dev_text.removeClass("isyOFF").addClass("isyON");
                    }
                }
            }

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
        return [this.file('js/jquery-3.2.1.min.js'),
            this.file('js/jquery.svg.min.js'),
            this.file('js/jquery.svganim.min.js'),
            this.file('js/jquery.svgdom.min.js'),
            this.file('js/popper.min.js'),
            this.file('js/bootstrap.min.js')
        ];
    },

    getStyles: function() {
        return [this.name + ".css", 'font-awesome.css',
            this.file('css/bootstrap-div.min.css'),
            this.file('css/bootstrap-div-tweaks.css')
        ];
    },

    getControlSubsystem: function() {
        return [
            this.file('js/ion.rangeSlider.min.js'),
            this.file('css/ion.rangeSlider.css'),
            this.file('css/ion.rangeSlider.skinHTML5.css'),
            this.file('node_modules/mdi/css/materialdesignicons.min.css')
        ];
    },

    handleControlEvent: function(device, command) {
        command = (typeof command === "string") ? command.replace(/btn/g, '') : command;
        var payload = { id: device.id, node: device.isyNode, kind: device.isyKind, config: device.isyConfig, cmd: command };
        if (device.isyKind === "dev" || device.isyKind === "tstat") {
            this.sendSocketNotification("DEVICE_CMD", payload);
        } else if (device.isyKind === "var") {
            this.sendSocketNotification("VARIABLE_CMD", payload);
        }
    },

    handleControlEventWithDebounce(device, command, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.debounceTimeout = null;
            this.handleControlEvent(device, command);
        }, wait);
    },

    debounceTimeout: null,

    // socketNotificationReceived from helper
    socketNotificationReceived: function(notification, payload) {
        var self = this;
        // console.log("MMM-ISY received notification: " + notification);
        if (notification === 'DEVICE_LIST_RECEIVED') {
            $('#isyLoadingModal').modal('hide');
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
            // Show Loading Modal
            $('#isyLoadingModal').modal({ backdrop: 'static' }).on("hidden.bs.modal", function(e) {
                $('#isyInnerWrapper').removeClass("modal-open");
            });
            $('#isyInnerWrapper').addClass("modal-open");
            $('.modal-backdrop').appendTo('#isyInnerWrapper');
            $('body').removeClass('modal-open');

            if (this.config.enableControls) {
                this.loadDependencies("getControlSubsystem", () => {
                    console.log("MMM-ISY Control Subsystem Loaded.");
                    this.sendSocketNotification("INITIALIZE_ISY", this.config);
                });
            } else {
                this.sendSocketNotification("INITIALIZE_ISY", this.config);
            }
        }
        if (notification === 'ISY_PROGRAM_CMD') {
            this.sendSocketNotification("PROGRAM_CMD", payload);
            // Payload structure: { id: 'pgmID', command: 'cmd'}
            // Possible values for cmd: run|runThen|runElse|stop|enable|disable|enableRunAtStartup|disableRunAtStartup
        }
    },

    deviceClicked: function(evt) {
        console.log(evt);
    },

    controlTemplates: {
        loading: `<div class="modal fade" id="isyLoadingModal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-body text-center text-white">
                            <h4>CONNECTING TO ISY...</h4>
                            <span class="fa fa-connectdevelop fa-spin fa-3x" style="padding: 1rem;"></span>
                        </div>
                    </div>
                </div>
            </div>`,
        dimmableLight: `<div class="row row-eq-height text-center" data-deviceType="dimmableLight">
                <div class="col-3">
                    <button type="button" id="btnDOF" class="btn btn-grey darken-2 btn-sm-i" data-dismiss="popover"><i class="mdi mdi-brightness-5 mdi-light mdi-16px" aria-hidden="true"></i></button>
                </div>
                <div class="col-6">
                    <input id="brightness" />
                </div>
                <div class="col-3">
                    <button type="button" id="btnDON" class="btn btn-grey darken-2 btn-sm-i" data-dismiss="popover"><i class="mdi mdi-brightness-7 mdi-light mdi-16px" aria-hidden="true"></i></button>
                </div>
            </div>
            <div class="row align-middle text-center">
                <div class="col-6">
                    <button id="btnDFOF" type="button" class="btn btn-grey darken-2 btn-sm" data-dismiss="popover"><i class="fa fa-angle-double-down"></i></button>
                </div>
                <div class="col-6">
                    <button id="btnDFON" type="button" class="btn btn-grey darken-2 btn-sm" data-dismiss="popover"><i class="fa fa-angle-double-up"></i></button>
                </div>
            </div>`,
        ecolorLight: `<div class="row row-eq-height text-center" data-deviceType="dimmableLight">
                <div class="col-3">
                    <button type="button" id="btnDOF" class="btn btn-grey darken-2 btn-sm-i" data-dismiss="popover"><i class="mdi mdi-brightness-5 mdi-light mdi-16px" aria-hidden="true"></i></button>
                </div>
                <div class="col-6">
                    <input id="brightness" />
                </div>
                <div class="col-3">
                    <button type="button" id="btnDON" class="btn btn-grey darken-2 btn-sm-i" data-dismiss="popover"><i class="mdi mdi-brightness-7 mdi-light mdi-16px" aria-hidden="true"></i></button>
                </div>
            </div>
            <div class="row align-middle text-center">
                <div class="col-6">
                    <button id="btnDFOF" type="button" class="btn btn-grey darken-2 btn-sm" data-dismiss="popover"><i class="fa fa-angle-double-down"></i></button>
                </div>
                <div class="col-6">
                    <button id="btnDFON" type="button" class="btn btn-grey darken-2 btn-sm" data-dismiss="popover"><i class="fa fa-angle-double-up"></i></button>
                </div>
            </div>`,
        colorLight: `<div class="row row-eq-height text-center" data-deviceType="dimmableLight">
                <div class="col-3">
                    <button type="button" id="btnDOF" class="btn btn-grey darken-2 btn-sm-i" data-dismiss="popover"><i class="mdi mdi-brightness-5 mdi-light mdi-16px" aria-hidden="true"></i></button>
                </div>
                <div class="col-6">
                    <input id="brightness" />
                </div>
                <div class="col-3">
                    <button type="button" id="btnDON" class="btn btn-grey darken-2 btn-sm-i" data-dismiss="popover"><i class="mdi mdi-brightness-7 mdi-light mdi-16px" aria-hidden="true"></i></button>
                </div>
            </div>
            <div class="row align-middle text-center">
                <div class="col-6">
                    <button id="btnDFOF" type="button" class="btn btn-grey darken-2 btn-sm" data-dismiss="popover"><i class="fa fa-angle-double-down"></i></button>
                </div>
                <div class="col-6">
                    <button id="btnDFON" type="button" class="btn btn-grey darken-2 btn-sm" data-dismiss="popover"><i class="fa fa-angle-double-up"></i></button>
                </div>
            </div>`,
        light: `<div class="btn-toolbar" style="justify-content: center;" role="toolbar" data-deviceType="light">
                        <button type="button" id="btnDOF" class="btn btn-grey darken-2" data-dismiss="popover"><i class="mdi mdi-brightness-5 mdi-light" aria-hidden="true"></i></button>
                        <button type="button" id="btnDON" class="btn btn-grey darken-2" data-dismiss="popover"><i class="mdi mdi-brightness-7 mdi-light" aria-hidden="true"></i></button>
            </div>`,
        outlet: `<div class="btn-toolbar" style="justify-content: center;" role="toolbar" data-deviceType="light">
                        <button type="button" id="btnDOF" class="btn btn-grey darken-2" data-dismiss="popover"><i class="mdi mdi-power-plug-off mdi-light" aria-hidden="true"></i></button>
                        <button type="button" id="btnDON" class="btn btn-grey darken-2" data-dismiss="popover"><i class="mdi mdi-power-plug mdi-light" aria-hidden="true"></i></button>
            </div>`,
        fan: `<div class="btn-toolbar" style="justify-content: center;"  role="toolbar" data-deviceType="fan">
                    <button type="button" id="btnOff" class="btn btn-grey darken-2 btn-sm-i"><i class="mdi mdi-fan-off"></i></button>
                    <button type="button" id="btnLow" class="btn btn-grey darken-2 btn-sm-i"><i class="mdi mdi-signal-cellular-1"></i></button>
                    <button type="button" id="btnMedium" class="btn btn-grey darken-2 btn-sm-i"><i class="mdi mdi-signal-cellular-2"></i></button>
                    <button type="button" id="btnHigh" class="btn btn-grey darken-2 btn-sm-i"><i class="mdi mdi-fan"></i></button>
            </div>`
    }
});