var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var mongodb;


const url = "mongodb://localhost:27017/";

/* 
This class handles DB logging, as well as detailed logs to both debug and output files
*/
module.exports = class Logger {

	constructor(){
		this.streams = {};
		var that = this;
		MongoClient.connect(url, {  
 			poolSize: 5
  			// other options can go here
		},function(err, client) {
   			that.mongodb=client.db('chainwatch');
   			console.log("Connected to MongoDB");
    		});
	}


	createOutputStreams(network){
		console.log("Created output streams for network: " + network);
		// create output streams
		var dStream = fs.createWriteStream(__dirname + '/log/' + network + '_debug.log', {flags : 'a'});
		var oStream = fs.createWriteStream(__dirname + '/log/' + network + '_out.log', {flags : 'a'});

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
			numBlocks: end-start+1,
			detected: this.getTimestring(),
			start: start,
			end: end,
			blocks: {}
		}

		// add blocks to logObj
		for(var i=start; i<=end; i++){
			var b = {
				old: oldWindow.blocks[i],
				new: newWindow.blocks[i]
			};
			logObj.blocks[i] = b;
		}

		this.mongodb.collection('reorg_events').insertOne(logObj);
	}


	async logMinerDensity(window, start, end, miner){
		var logObj = {
			detected: this.getTimestring(),
			miner: miner,
			numBlocks:end-start+1,
			start: start,
			end: end,
			blocks:{}
		}

		for(var i=start;i<=end; i++){
			logObj.blocks[i] = window.blocks[i];
		}
		// don't relog same event
		var exists = await this.mongodb.collection('density_events').count({end: {$gte: start, $lte: end}}, {limit:1});
		console.log(exists);
		if(exists == 0){
			this.mongodb.collection('density_events').insertOne(logObj);
		}
	}


	// prints data to the appropriate output stream
	outputToStream(network, stream, str){
		this.streams[network][stream].write(str);
	}

	getTimestring(){
		return new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
	}
}
