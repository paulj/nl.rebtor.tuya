'use strict';

const Homey = require('homey');
const TuyAPI = require('tuyapi');
const Tuydriver = require('tuydriver');

class Driver extends Homey.Driver {
    async onPair(session, ModelTypeCode = '') {
        const Manifest = this.manifest;
        var DeviceTypeCode = '';
        var ProductIDCode = '';
        var SubDeviceType = '';
        for (const Settings of Manifest.settings) {
            for (const Instelling of Settings.children) {
                if (Instelling.id == 'DeviceTypeCode') {
                    Tuydriver.devicelog('DeviceTypeCode =' + Instelling.value);
                    DeviceTypeCode = Instelling.value;
                } else if (Instelling.id == 'ModelTypeCode') {
                    Tuydriver.devicelog('ModelTypeCode' + Instelling.value);
                    ModelTypeCode = Instelling.value;
                } else if (Instelling.id == 'ProductIDCode') {
                    Tuydriver.devicelog('ProductIDCode' + Instelling.value);
                    ProductIDCode = Instelling.value;
                } else if (Instelling.id == 'SubDeviceType') {
                    Tuydriver.devicelog('SubDeviceType' + Instelling.value);
                    SubDeviceType = Instelling.value;
                }
            };
        };

        const APIKey = this.homey.settings.get('apikey');
        const APISecret = this.homey.settings.get('apipassword');
        const APIRegion = this.homey.settings.get('region');
        const DeviceID = this.homey.settings.get('randomDeviceId');

        const url = 'https://openapi.tuya'+ APIRegion +'.com';

        session.setHandler("list_devices", async function () {
            const devices = await Tuydriver.SearchDevices(
                DeviceTypeCode, ModelTypeCode, ProductIDCode, SubDeviceType,
                APIKey, APISecret, APIRegion, DeviceID);
          return devices;
        });
    }
}

console.log('Loading Tuya.js support');

class DeviceFactory {
    static _apis = {};

    static retrieveAPI(options) {
        var newAPI = false;

        if (this._apis[options.id] == null) {
            this._apis[options.id] = new TuyAPI(options);
            this._apis[options.id]._listeners = 0;

            newAPI = true;

            console.log("New API created for device ID: ", options.id);
        } else {
            console.log("API already exists for device ID: ", options.id);
        }

        var tuyapi = this._apis[options.id];

        tuyapi._listeners++;

        if (newAPI) {
            
            function connect() {
                if (tuyapi._destroyed) return;

                if (!tuyapi.isConnected()) {
                    // Find device on network
                    tuyapi.find().then(() => {
                        Tuydriver.devicelog('Device ID : '+ options.id + ' has been found at ' + tuyapi.device.ip);
        
                        // Connect to device
                        tuyapi.connect().catch(err => {
                            console.error(err);
                        });
                    })
                    .catch(err => {
                        console.error(err);
                    });
                }
        
                // Keep connection alive
                setTimeout(() => {
                    connect();
                }, 20000);
            }

            connect();
        }

        return tuyapi;
    }

    static releaseAPI(id) {
        console.log("Releasing API for device ID: ", id);

        if (!this._apis[id]) {
            return;
        }

        this._apis[id]._listeners--;

        if (this._apis[id]._listeners == 0) {
            this._apis[id].disconnect();
            this._apis[id]._destroyed = true;
            delete this._apis[id];
        }
    } 
}

class Device extends Homey.Device {
    async onInit() {
        const driverName = this.driver.manifest.name.en;
        Tuydriver.devicelog('Device name: ', driverName + ': '+ this.getName()+ ' has been inited');
        Tuydriver.clearlog(this);

        this.tuyapi = DeviceFactory.retrieveAPI({
            id: this.getSetting('ID'),
            key: this.getSetting('Key'),
            version: this.getSetting('Version')
        });

        this._connectedCallback = () => {
            Tuydriver.devicelog('Device', 'Connected to device!');
            this.setAvailable();
        };
        this._disconnectedCallback = () => {
            Tuydriver.devicelog('Device', 'Disconnected from device.');
            this.setUnavailable('Device was disconnected');
        };
        this._errorCallback = error => {
            Tuydriver.devicelog('Error: ', error);
            this.setUnavailable(error);
        };

        this.tuyapi.on('connected', this._connectedCallback);
        this.tuyapi.on('disconnected',this._disconnectedCallback);
        this.tuyapi.on('error', this._errorCallback);

        if (this.tuyapi.isConnected()) {
            this.setAvailable();
        } else {
            this.setUnavailable('Connecting to device');
        }
    }

    onUninit() {
        // Unbind from events
        this.tuyapi.off('connected', this._connectedCallback);
        this.tuyapi.off('disconnected',this._disconnectedCallback);
        this.tuyapi.off('error', this._errorCallback);

        DeviceFactory.releaseAPI(this.getSetting('ID'));
    }

    // connect() {
    //     // Don't attempt to connect if device has been destroyed
    //     if (this._destroyed) {
    //         return;
    //     }

    //     if (!this.tuyapi.isConnected()) {
    //         // Find device on network
    //         this.tuyapi.find().then(() => {
    //             Tuydriver.devicelog('Device name: ', this.driver.manifest.name.en + ': '+ this.getName()+ ' has been found at ' + this.tuyapi.device.ip);

    //             // Connect to device
    //             this.tuyapi.connect().catch(err => {
    //                 console.error(err);
    //             });
    //         })
    //         .catch(err => {
    //             console.error(err);
    //         });
    //     }

    //     // Keep connection alive
    //     setTimeout(() => {
    //         this.connect();
    //     }, 20000);
    // }
};

module.exports = { Driver, Device };
