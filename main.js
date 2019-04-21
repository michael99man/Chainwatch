var Watcher = require("./watcher.js");
var Logger = require("./logger.js");
var Ropsten_Adapter = require("./ropsten_adapter.js");
var Ethereum_Adapter = require("./ethereum_adapter.js");


var logger = new Logger();
var ropsten_watcher = new Watcher(new Ropsten_Adapter(), logger);
var ethereum_watcher = new Watcher(new Ethereum_Adapter(), logger);