## [1.0.5] - Advanced Node Server Functions

Changed:

* Updated to use v0.6.0+ of isy-js package to take advantage of advanced node server node functions

Added: 

* Ability to trigger states based on other properties instead of just Current State (ST). For example, the Harmony Hub node server always shows ST=1 (True) when the node server is connected, but changes GV3 to the current activity. GV3=0 means the system is off, so we want to use GV3 for the status instead of ST. In the config, add the node and 'useProp: "GV3"' to use a different property for the current state.

## [1.0.4] - Transition to SVG and jQuery

Added:

* Transitioned graphics from PNG & Transparency layers to SVG (Scalable Vector Graphics) format with direct javascript interaction via jQuery.  Simplifies ability to interact with the graphics since a separate image is not required for every device.

## [1.0.3] - Advanced Node Configurations

Added:

* Ability to assign advanced node parameters similar to the existing variable options, including sending notification on device changes

Fixed:

* Bug fixes required for compatibility with ISY v5

## [1.0.2] - Notifications on Variable Change

* Added abiltiy to send module notifications when a variable is changed by adding `notifyOn` or `notifyOff` parameters to the variable map.

## [1.0.1] - CSS Updates

* Updated Thermostat CSS to scale with floor plan
* Updated correct display of header

## [1.0.0] - Inital Release

First public release
