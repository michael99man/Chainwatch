var Watcher = require("./watcher.js");
//var ropsten = require("./watcher_ropsten.js");

var ropsten_adapter = require("./ropsten_adapter.js");
var ethereum_adapter = require("./ethereum_adapter.js");


var ropsten_watcher = new Watcher(new ropsten_adapter());
var ethereum_watcher = new Watcher(new ethereum_adapter());