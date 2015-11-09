/** 
  * Copyright 2015 Advantech
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

var alljoyn_action = require("node-alljoyn");

module.exports = function(RED) {
    "use strict";

    function alljoynAction(config) {
        // Create a RED node
        RED.nodes.createNode(this, config);

        // Store local copies of the node configuration (as defined in the .html)
        var node = this;

        // Read the data & return a message object
        this.read = function(msgIn) {
            var msg = msgIn ? msgIn : {};

        var result = alljoyn_action.doAction(config.device, config.intf, config.action);
        if (result) {
            // Renew BusName and try again!
            alljoyn_action.updateBusName();
            result = alljoyn_action.doAction(config.device, config.intf, config.action);
        }
        if (result)
            throw "Error : "+RED._("Alljoyn-Action.errors.operationfailed");

            msg.payload = "result=" + result + " [DoAction] dev=" + config.device + " intf=" + config.intf + " act=" + config.action;
            msg.topic   = node.name;
            return msg;
        };

        // respond to inputs....
        this.on('input', function (msg) {
            msg = this.read(msg);

            if (msg)
                node.send(msg);
        });
    }
    // Register the node by name.
    RED.nodes.registerType("Alljoyn-Action", alljoynAction);

    // Functions for HTML control
    RED.httpAdmin.get("/Alljoyn-Action/:id", function(req,res) {
        var devices = [];
        RED.log.info(RED._("GetDevice: id=" + req.params.id));
        var result = alljoyn_action.findAlljoynServices();
        if (result == 0) {
            var dev_num = alljoyn_action.getDeviceName();
            for (var i=0; i < dev_num; i++) {
                devices.push(alljoyn_action.getDeviceName(i));
            }
        }
        res.send(devices);
    });

    RED.httpAdmin.get("/Alljoyn-Action-Renew/:id", function(req,res) {
        var QStatus = [];
        RED.log.info(RED._("Renew: id=" + req.params.id));
        var result = alljoyn_action.updateBusName();
        QStatus.push(result);
        res.send(QStatus);
    });

    RED.httpAdmin.get("/Alljoyn-Action-GetIntf/:id/:myDev", function(req,res) {
        var intfs = [];
        var myDev = req.params.myDev;
        RED.log.info(RED._("GetIntf: id=" + req.params.id + " myDev=" + myDev));
        var result = alljoyn_action.updateInterface(myDev);
        if (result == 0) {
            var itf_num = alljoyn_action.getInterfaceName();
            for (var i=0; i < itf_num; i++) {
                intfs.push(alljoyn_action.getInterfaceName(i));
            }
        }
        res.send(intfs);
    });

    RED.httpAdmin.get("/Alljoyn-Action-GetAction/:id/:myItf", function(req,res) {
        var acts = [];
        var myItf = req.params.myItf;
        RED.log.info(RED._("GetAction: id=" + req.params.id + " myItf=" + myItf));
        var act_num = alljoyn_action.getActionName(myItf);
        for (var i=0; i < act_num; i++) {
            acts.push(alljoyn_action.getActionName(myItf, i));
        }
        res.send(acts);
    });
}
