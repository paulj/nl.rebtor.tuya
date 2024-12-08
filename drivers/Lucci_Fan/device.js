'use strict';

const Tuya = require('../../lib/tuya');
const Tuydriver = require('tuydriver');

class Device extends Tuya.Device {
    async onInit() {
        super.onInit();

        this.tuyapi.on('data', data => {
            Tuydriver.devicelog('Data from device:', data);
            Tuydriver.processdata(this, data, 'Fan');
        });

        this.registerCapabilityListener('onoff', async(value) => {
            Tuydriver.sendvalues(this, this.tuyapi, value, 'onoff');
        });

        this.registerCapabilityListener('fan_speed', async(value) => {
            Tuydriver.sendvalues(this, this.tuyapi, value, 'fan_speed');
        });
    }
};

module.exports = Device;
