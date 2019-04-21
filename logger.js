var MongoClient = require('mongodb').MongoClient;
var mongodb;


const url = "mongodb://localhost/chainwatch";

/* 
This class handles DB logging, as well as detailed logs to both debug and output files
*/
module.exports = class Logger {

	constructor(){

		this.streams = {};

		MongoClient.connect(url, {  
 			poolSize: 5
  			// other options can go here
		},function(err, db) {
   			this.mongodb=db;
   			console.log("Connected to MongoDB");
    	});
	}


	createOutputStreams(network){
		console.log("Created output streams for network: " + network);
		// create output streams
		dStream = fs.createWriteStream(__dirname + '/log/' + network + '_debug.log', {flags : 'a'});
		oStream = fs.createWriteStream(__dirname + '/log/' + network + '_out.log', {flags : 'a'});

		this.streams[network] = {"debug": dStream, "output": oStream};
	}

	async logReorg(oldWindow, newWindow, start, end){
		/* DATA SCHEMA
		* numBlocks
		* start
		* end
		* blocks:{blockNo: {forkHash, canonicalHash}}
		*/
		var logObj = {
			numBlocks = end-start+1,
			detected: getTimestring(),
			start: start,
			end: end,
			blocks = {}
		}

		// add blocks to logObj
		for(var i=start; i<=end; i++){
			var b = {
				old: oldWindow.blocks[i],
				new: newWindow.blocks[i]
			};
			logObj.blocks[i] = b;
		}

		db.collection('reorg_events').insertOne(logObj);
	}


	async logMinerDensity(window, start, end){
		var logObj = {
			numBlocks = end-start+1,
			blocks = {}
		}

		for(var i=start;i<=end; i++){
			logObj.blocks[i] = window.blocks[i];
		}

		db.collection('51_events').insertOne(logObj);
	}


	// prints data to the appropriate output stream
	outputToStream(network, stream, str){
		this.streams[network][stream].write(str);
	}

	getTimestring(){
		return new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
	}
}
