var Watcher = require("./watcher.js");
var Logger = require("./logger.js");
var Ropsten_Adapter = require("./adapters/ropsten_adapter.js");
var Ethereum_Adapter = require("./adapters/ethereum_adapter.js");

var logger = new Logger();
logger.initDB().then(()=>{
	var ropsten_watcher = new Watcher(new Ropsten_Adapter(), logger);
	var ethereum_watcher = new Watcher(new Ethereum_Adapter(), logger);
});
