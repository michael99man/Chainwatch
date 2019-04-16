var Watcher = require("./watcher.js");
//var ropsten = require("./watcher_ropsten.js");
var ropsten_engine = require("./ropsten_engine.js");


var ropsten = new Watcher(new ropsten_engine(), "ropsten");


/*

ropsten.launch();
mainnet.launch();


// to do later! (figure out overloading)
class Watcher {

}*/