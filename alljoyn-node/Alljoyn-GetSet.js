/**
 * Copyright 2015 Brendan Murray
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var exec = require('child_process').exec;

var alljoyn = require("node-alljoyn");

//var HOST = "127.0.0.1";
//var PORT = 5000;

module.exports = function(RED) {
    "use strict";

    function RestRespEmitter() {
        EventEmitter.call(this);
    }
    util.inherits(RestRespEmitter, EventEmitter);

    RestRespEmitter.prototype.msgJsonObj = null;
    RestRespEmitter.prototype.sigRecv = function sigRecv() {
        //console.log("fire Rest Recv");
        this.emit('recv');
    };

    var restRespEmitter = null;
    //var client = null;
    var hasRestAnswer = -1;
    var msgJsonObj = null;

    var gAlljoynStatus = null;
    var gAlljoynDevNum = 0;
    var gAlljoynCtlPanelNum = 0;
    var gAlljoynDev = 1;

    // The main node definition - most things happen in here
    function AlljoynGet(config) {
        // Create a RED node
        RED.nodes.createNode(this, config);

        // Store local copies of the node configuration (as defined in the .html)
        var node = this;
        node.operNow = config.operNow;
        node.operSaved = config.operSaved;
        node.deviceNow = config.deviceNow;
        node.deviceSaved = config.deviceSaved;
        node.ctlPanelNow = config.ctlPanelNow;
        node.ctlPanelSaved = config.ctlPanelSaved;
        node.propertyNow = config.propertyNow;
        node.propertySaved = config.propertySaved;
        node.propIndexNow = config.propIndexNow;
        node.propIndexSaved = config.propIndexSaved;
        node.setvalue = config.setvalue;

        //restRespEmitter = new RestRespEmitter();

        function checkRestResult() {
            if (hasRestAnswer == 1) {
                console.log("Send msg to next node !!");
                var msg = {};
                msg.payload = JSON.stringify(msgJsonObj);
                msg.topic = node.topic || node.name;

                hasRestAnswer = -1;
                node.send(msg);		// this.send() failed, self.send() failed
            }

            setImmediate(checkRestResult);
        }

        // Read the data & return a message object later
        this.read = function(msgIn) {
            node.msg = msgIn ? msgIn : {};

            console.log("node.operSaved=" + node.operSaved);
            console.log("node.deviceNow=" + node.deviceNow);
            console.log("node.deviceSaved=" + node.deviceSaved);
            console.log("node.ctlPanelNow=" + node.ctlPanelNow);
            console.log("node.ctlPanelSaved=" + node.ctlPanelSaved);
            console.log("node.propertyNow=" + node.propertyNow);
            console.log("node.propertySaved=" + node.propertySaved);
            console.log("node.propIndexNow=" + node.propIndexNow);
            console.log("node.propIndexSaved=" + node.propIndexSaved);
            console.log("node.setvalue=" + node.setvalue); 
             
            var ctlPanelIndex = node.ctlPanelNow;
            var propertyString = alljoyn.getProperty(ctlPanelIndex);

            if (propertyString !== null) {
                // pasre propertyString and push to Items[2]
                console.log("got propertyString=" + propertyString);
                //Items[2].push("Board Name");
                //Items[2].push("Board Manufacturer");

                // try catch ?
                var propertyJsonObj = JSON.parse(propertyString);
                //if (node.ctlPanelNow === "DisplayContainer" || node.ctlPanelNow === "GPIOContainer") {
                if (node.ctlPanelNow == 3 || node.ctlPanelNow == 4) {
                    //var propIndex = -1;
                    // check list
                    if (propertyJsonObj.hasOwnProperty('Property_0') && propertyJsonObj['Property_0'].hasOwnProperty('list')) {
                        //console.log("current index value=", propertyJsonObj['Property_0']['value']);
                        var currentPropIndex = propertyJsonObj['Property_0']['value'];
                        console.log("currentPorpIndex=" + currentPropIndex);
                        //console.log("Property num in list=" + Object.keys(propertyJsonObj['Property_0']['list']).length);
                        var listIndex = -1;
                        var listLength = 0 || Object.keys(propertyJsonObj['Property_0']['list']).length;
                        //console.log("node.propIndexNow=" + node.propIndexNow);
                        //console.log("node.propIndexSaved=" + node.propIndexSaved);
                        for(var i=0; i<listLength; i++) {
                            //console.log(propertyJsonObj['Property_0']['list'][i]['Display']);
                            if (node.propIndexSaved === propertyJsonObj['Property_0']['list'][i]['Display']) {
                                listIndex = i;
                                break;
                            }
                        }

                        console.log("listIndex=" + listIndex);                            
                        if (listIndex != currentPropIndex) {    // 2 different types, do not use !==
                            console.log("set index");
                            //alljoyn.setProperty("{{\"index\":\"0\", \"value\":\"7\"}}");
                            alljoyn.setProperty("{{\"index\":\"0\", \"value\":\"" + listIndex +"\"}}");
                            var newPropertyString = alljoyn.getProperty(ctlPanelIndex);
                            console.log("newPropertyString=" + newPropertyString);
                        }

                        //if (node.operNow === "Set") {
                            
                        //} else {
                            // check node.propertySaved, and return parsed Get value
                            for (var property in propertyJsonObj) {
                                if (propertyJsonObj[property]['name'] === node.propertySaved) {
                                    if (node.operNow === "Set") {
                                        var targetPropIndex = propertyJsonObj[property]['index'];
                                        //console.log("propertyJsonObj[property]['index']=" + targetPropIndex);
                                        var setResult = alljoyn.setProperty("{{\"index\":\"" + targetPropIndex  + "\", \"value\":\"" + node.setvalue + "\"}}");
                                        //var setResult = alljoyn.setProperty("{{\"index\":\"1\", \"value\":\"7\"}}");
                                        //var setResult = alljoyn.setProperty("{{\"index\":\"0\", \"value\":\"2\"},{\"index\":\"1\", \"value\":\"7\"}}");
                                        console.log("set result=" + setResult);
                                    } else {
                                        var msg = {};
                                        msg.payload = JSON.stringify(propertyJsonObj[property]);
                                        msg.topic = node.topic || node.name;
                                        //node.send(JSON.stringify(propertyJsonObj[property]));
                                        node.send(msg);
                                        break;
                                    }
                                }
                            }
                        //}
                    } else {
                        console.log("No required list property found");
                    }
                } else {
                    for (var property in propertyJsonObj) {
                        //console.log("1:" + property);
                        //console.log("2:" + property['name']);
                        //console.log("3:" + propertyJsonObj[property]['name']);
                        //console.log("4:" + propertyJsonObj[property]);
                        console.log("5:" + JSON.stringify(propertyJsonObj[property]));
                        if (propertyJsonObj[property]['name'] === node.propertySaved) {
                            var msg = {};
                            msg.payload = JSON.stringify(propertyJsonObj[property]);
                            msg.topic = node.topic || node.name;
                            //node.send(JSON.stringify(propertyJsonObj[property]));
                            node.send(msg);
                            break;
                        }
                    }
                }

            } 

            //hasRestAnswer = 0;
            //setImmediate(checkRestResult);
        };

        // respond to inputs....
        this.on('input', function(msg) {
            this.read(msg);
        });
    }

    function AlljoynSet(config) {
        // Create a RED node
        RED.nodes.createNode(this, config);

        // Store local copies of the node configuration (as defined in the .html)
        var node = this;
        node.operNow = config.operNow;
        node.operSaved = config.operSaved;
        node.deviceNow = config.deviceNow;
        node.deviceSaved = config.deviceSaved;
        node.ctlPanelNow = config.ctlPanelNow;
        node.ctlPanelSaved = config.ctlPanelSaved;
        node.propertyNow = config.propertyNow;
        node.propertySaved = config.propertySaved;
        node.propIndexNow = config.propIndexNow;
        node.propIndexSaved = config.propIndexSaved;
        node.setvalue = config.setvalue;

        //restRespEmitter = new RestRespEmitter();

        function checkRestResult() {
            if (hasRestAnswer == 1) {
                console.log("Send msg to next node !!");
                var msg = {};
                msg.payload = JSON.stringify(msgJsonObj);
                msg.topic = node.topic || node.name;

                hasRestAnswer = -1;
                node.send(msg);		// this.send() failed, self.send() failed
            }

            setImmediate(checkRestResult);
        }

        // Read the data & return a message object later
        this.read = function(msgIn) {
            node.msg = msgIn ? msgIn : {};

            console.log("node.operNow=" + node.operNow);
            console.log("node.operSaved=" + node.operSaved);
            console.log("node.deviceNow=" + node.deviceNow);
            console.log("node.deviceSaved=" + node.deviceSaved);
            console.log("node.ctlPanelNow=" + node.ctlPanelNow);
            console.log("node.ctlPanelSaved=" + node.ctlPanelSaved);
            console.log("node.propertyNow=" + node.propertyNow);
            console.log("node.propertySaved=" + node.propertySaved);
            console.log("node.propIndexNow=" + node.propIndexNow);
            console.log("node.propIndexSaved=" + node.propIndexSaved);
            console.log("node.setvalue=" + node.setvalue); 

            //console.log(node.operNow + " Rest CMD:" + rest);
            if (node.operNow === "Set") {
                //client.write("SET," + rest + "," + node.setvalue);
            } else {
                //client.write("GET," + rest);
            }
              
            var ctlPanelIndex = node.ctlPanelNow;
            var propertyString = alljoyn.getProperty(ctlPanelIndex);

            if (propertyString !== null) {
                // pasre propertyString and push to Items[2]
                console.log("got propertyString=" + propertyString);
                //Items[2].push("Board Name");
                //Items[2].push("Board Manufacturer");

                // try catch ?
                var propertyJsonObj = JSON.parse(propertyString);
                //if (node.ctlPanelNow === "DisplayContainer" || node.ctlPanelNow === "GPIOContainer") {
                if (node.ctlPanelNow == 3 || node.ctlPanelNow == 4) {
                    //var propIndex = -1;
                    // check list
                    if (propertyJsonObj.hasOwnProperty('Property_0') && propertyJsonObj['Property_0'].hasOwnProperty('list')) {
                        //console.log("current index value=", propertyJsonObj['Property_0']['value']);
                        var currentPropIndex = propertyJsonObj['Property_0']['value'];
                        console.log("currentPorpIndex=" + currentPropIndex);
                        //console.log("Property num in list=" + Object.keys(propertyJsonObj['Property_0']['list']).length);
                        var listIndex = -1;
                        var listLength = 0 || Object.keys(propertyJsonObj['Property_0']['list']).length;
                        //console.log("node.propIndexNow=" + node.propIndexNow);
                        //console.log("node.propIndexSaved=" + node.propIndexSaved);
                        for(var i=0; i<listLength; i++) {
                            //console.log(propertyJsonObj['Property_0']['list'][i]['Display']);
                            if (node.propIndexSaved === propertyJsonObj['Property_0']['list'][i]['Display']) {
                                listIndex = i;
                                break;
                            }
                        }

                        console.log("listIndex=" + listIndex);                            
                        if (listIndex != currentPropIndex) {    // 2 different types, do not use !==
                            console.log("set index");
                            //alljoyn.setProperty("{{\"index\":\"0\", \"value\":\"7\"}}");
                            alljoyn.setProperty("{{\"index\":\"0\", \"value\":\"" + listIndex +"\"}}");
                            var newPropertyString = alljoyn.getProperty(ctlPanelIndex);
                            console.log("newPropertyString=" + newPropertyString);
                        }

                        //if (node.operNow === "Set") {
                            
                        //} else {
                            // check node.propertySaved, and return parsed Get value
                            for (var property in propertyJsonObj) {
                                if (propertyJsonObj[property]['name'] === node.propertySaved) {
                                    if (node.operNow === "Set") {
                                        var targetPropIndex = propertyJsonObj[property]['index'];
                                        //console.log("propertyJsonObj[property]['index']=" + targetPropIndex);
                                        var setResult = alljoyn.setProperty("{{\"index\":\"" + targetPropIndex  + "\", \"value\":\"" + node.setvalue + "\"}}");
                                        //var setResult = alljoyn.setProperty("{{\"index\":\"1\", \"value\":\"7\"}}");
                                        //var setResult = alljoyn.setProperty("{{\"index\":\"0\", \"value\":\"2\"},{\"index\":\"1\", \"value\":\"7\"}}");
                                        console.log("set result=" + setResult);
                                    } else {
                                        var msg = {};
                                        msg.payload = JSON.stringify(propertyJsonObj[property]);
                                        msg.topic = node.topic || node.name;
                                        //node.send(JSON.stringify(propertyJsonObj[property]));
                                        node.send(msg);
                                        break;
                                    }
                                }
                            }
                        //}
                    } else {
                        console.log("No required list property found");
                    }
                } else {
                    for (var property in propertyJsonObj) {
                        //console.log("1:" + property);
                        //console.log("2:" + property['name']);
                        //console.log("3:" + propertyJsonObj[property]['name']);
                        //console.log("4:" + propertyJsonObj[property]);
                        console.log("5:" + JSON.stringify(propertyJsonObj[property]));
                        if (propertyJsonObj[property]['name'] === node.propertySaved) {
                            var msg = {};
                            msg.payload = JSON.stringify(propertyJsonObj[property]);
                            msg.topic = node.topic || node.name;
                            //node.send(JSON.stringify(propertyJsonObj[property]));
                            node.send(msg);
                            break;
                        }
                    }
                }

            } 

            //hasRestAnswer = 0;
            //setImmediate(checkRestResult);
        };

        // respond to inputs....
        this.on('input', function(msg) {
            this.read(msg);
        });
    }
    // Register the node by name.
    RED.nodes.registerType("ControlPanel-Get", AlljoynGet);
    RED.nodes.registerType("ControlPanel-Set", AlljoynSet);


    // response for HTML control
    var Items = [5];
    for (var i=0; i<5; i++) {
        Items[i] = [];
    }


    // Functions for HTML control
    RED.httpAdmin.get("/Alljoyn-GetSet-GetDevice", function(req,res) {
        //console.log("In SN_GetIntf !!");

        Items[0].length = 0;

        var alljoynStatus = alljoyn.findControlPanelServices();
        if (alljoynStatus) {
            console.log('Alljoyn init error:' + alljoynStatus);
            return;
        }

        var alljoynDevNum = alljoyn.getControlPanelDeviceName();
        console.log("Alljoyn-GetSet-GetDevice(): dev num=" + alljoynDevNum);

        if (alljoynDevNum > 0) {
            for (var i=0; i<alljoynDevNum; i++) {
                console.log("Alljoyn-GetSet-GetDevice(): dev[" + i + "]=" + alljoyn.getControlPanelDeviceName(i));
                Items[0].push(alljoyn.getControlPanelDeviceName(i));
            }
        } else {
            Items[0].push("None");
        }

        res.send(Items);
    });


    RED.httpAdmin.get("/Alljoyn-GetSet-GetCtlPanel/:confDevice", function(req,res) {
        //console.log("In SN_GetIntf !!");

        var confDevice = req.params.confDevice;
        //console.log("confDevice=", confDevice);
        var confDeviceStr = null;
        //RED.log.info(RED._("GetAttrib: id=" + req.params.id + " Intf=" + confIntf + " Dev=" + confDev + " Topic=" +confTopic));
        if (confDevice === 'undefined' || confDevice === 'null') 
        {
            console.log("Alljoyn-GetSet-GetCtlPanel: unknown Device!!");            
            res.send(null);
            return;
        }
        /*
        if (typeof confDevice === 'string') {
            console.log("get ctlPanel, confDevice=", confDevice);
            confDeviceStr = confDevice;
        } else if (Array.isArray(confDevice)) {
            console.log("confDevice is array, array.length=", confDevice.length); 
        } else {
            console.log("Error: unknown device type");
            res.send(null);
            return;
        } */


        //var restGetGwIntf = "IoTGW";
        Items[1].length = 0;
        Items[1] = [];
        var targetDeviceIndex = confDevice;
                                  
        if (targetDeviceIndex > -1) {
            var result = alljoyn.updateControlPanel(targetDeviceIndex);
            if (result == 0) { 
                var alljoynCtlPanelNum = alljoyn.getControlPanel();
                //console.log("Alljoyn-GetSet-GetCtlPanel(): CtlPanel Num=" + alljoynCtlPanelNum);
                for (var i=0; i<alljoynCtlPanelNum; i++) {
                    //console.log("Alljoyn-GetSet-GetCtlPanel(): ctlPanel[" + i +"]=" + alljoyn.getControlPanel(i));
                    Items[1].push(alljoyn.getControlPanel(i));
                }
            }
        } else {
            console.log("ctlPanel not found 2");
            Items[1].push("Not found! Try reflash device.");
        }

        res.send(Items);
    });


    //RED.httpAdmin.get("/Alljoyn-GetSet-GetProperty/:confOper/:confDevice/:confCtlPanel", function(req,res) {
    RED.httpAdmin.get("/Alljoyn-GetSet-GetProperty/:confOper/:confCtlPanel", function(req,res) {
        //console.log("In SN_GetAttrib !!");

        var confOper = req.params.confOper;
        //RED.log.info(RED._("GetAttrib: id=" + req.params.id + " Intf=" + confI
        if (confOper === 'undefined' || confOper === 'null')
        {
            console.log("Alljoyn-GetSet-GetCtlPanel: unknown Operation!!");
            res.send(null);
            return;
        }
/*
        var confDevice = req.params.confDevice;
        //RED.log.info(RED._("GetAttrib: id=" + req.params.id + " Intf=" + confIntf + " Dev=" + confDev + " Topic=" +confTopic));
        if (confDevice === 'undefined' || confDevice === 'null') 
        {
            console.log("Alljoyn-GetSet-GetCtlPanel: unknown Device!!");            
            res.send(null);
            return;
        }
*/
	    var confCtlPanel = req.params.confCtlPanel;
	    //RED.log.info(RED._("GetAttrib: id=" + req.params.id + " Intf=" + confIntf + " Dev=" + confDev + " Topic=" +confTopic));
        if (confCtlPanel === 'undefined' || confCtlPanel === 'null') 
        {
            console.log("Alljoyn-GetSet-GetPropertyOfCtlPanel: unknown ControlPanel!!");            
            res.send(null);
            return;
        }

        Items[2].length = 0;
        Items[3].length = 0;
        Items[2] = [];
        Items[3] = [];

        var targetDeviceIndex = confCtlPanel;

        if (targetDeviceIndex > -1) {
            var propertyString = null;
            var ctlPanel = alljoyn.getControlPanel(targetDeviceIndex);
            console.log("GetProperty: in " + ctlPanel);
            var result = alljoyn.updateProperty(targetDeviceIndex);
            if (result == 0) {                                         
              propertyString = alljoyn.getProperty(targetDeviceIndex);                        
            }                                                

            if (propertyString !== null && propertyString !== undefined && propertyString !== "") {
                // pasre propertyString and push to Items[2]
                /* Debug
                console.log("got propertyString=" + propertyString);
                */
                
                var propertyJsonObj = null;

                try {
                    propertyJsonObj = JSON.parse(propertyString);
                    /*
                    for (var property in propertyJsonObj) {
                        //console.log("1:" + property);
                        //console.log("2:" + property['name']);
                        //console.log("3:" + propertyJsonObj[property]['name']);

                        if (confOper === "Set") {
                            //console.log("writable:" + propertyJsonObj[property]['writable']);
                            if (propertyJsonObj[property]['writable'] !== "1") {
                                continue;
                            }
                        }

                        Items[2].push(propertyJsonObj[property]['name']); 
                    } */
                } catch (e) {
                    console.log("Alljoyn property format error !");
                }

                for (var property in propertyJsonObj) {
                    //console.log("1:" + property);
                    //console.log("2:" + property['name']);
                    //console.log("3:" + propertyJsonObj[property]['name']);
                    //console.log("4:" + propertyJsonObj[property]);

                    //if (confCtlPanel === "DisplayContainer" || confCtlPanel === "GPIOContainer") {
                    if (confCtlPanel == 3 || confCtlPanel == 4) {
                        // check list of property_0, and show its display in propIndexNow
                        if (property === "Property_0") {  
                            if (propertyJsonObj[property].hasOwnProperty('list')) {
                                //console.log(confCtlPanel + " has list in property");
                                for (var item in propertyJsonObj[property]['list']) {
                                    //console.log(propertyJsonObj[property]['list'][item]['Display']);
                                    //console.log(propertyJsonObj[property]['list'][item]);
                                    Items[3].push(propertyJsonObj[property]['list'][item]['Display']);
                                }
                            } else {
                                console.log(confCtlPanel + " has NO list in property");
                                Items[2].push("None");
                                Items[3].push("None");
                                break;
                            }
                 
                            continue;
                        } //else {
                    } //else {

                        if (confOper === "Set") {
                            //console.log("writable:" + propertyJsonObj[property]['writable']);
                            if (propertyJsonObj[property]['writable'] !== "1") {
                                continue;
                            }
                        }

                        Items[2].push(propertyJsonObj[property]['name']);
                    //}
                }


                if (Items[2].length === 0) {
                    Items[2].push("None");
                }
            } else {
                console.log("Alljoyn get property failed !");
            }
        } else {
            console.log("property not found 2");
            Items[2].push("Not found! Try reflash device.");
        }

        res.send(Items);

    });

}

