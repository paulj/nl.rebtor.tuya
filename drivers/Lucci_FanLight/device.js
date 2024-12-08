'use strict';

const Tuya = require('../../lib/tuya');
const Tuydriver = require('tuydriver');

class Device extends Tuya.Device {
    async onInit() {
        super.onInit();

        this.tuyapi.on('data', data => {
            Tuydriver.devicelog('Data from device:', data);
            Tuydriver.processdata(this, data, 'FanLight');
        });

        this.registerCapabilityListener('onoff', async(value) => {
            Tuydriver.sendvalues(this, this.tuyapi, value, 'onoff.light');
        });
    }
};

module.exports = Device;
