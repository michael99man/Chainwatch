const config = require('./config.json');
require('dotenv').config();
var colors = require('colors');
var util = require('util');

/*********************************************************
Watcher.js provides generalized engine logic for detecting
suspicious chain reorganizations. It is designed to be used
with adapter classes for each public blockchain you wish
to monitor.

Adapters must implement the following:
	initProvider(url:location of provider, fallback:t/f) -> void
	getBlock(n:block number) -> {blockNo, miner, hash}
	blockHeight() -> integer

**********************************************************/

module.exports = class Watcher {

	constructor(a, logger){
		this.adapter = a;
		this.network = a.network;
		this.options = config[this.network];
		this.debug = false;
		this.window_chain = {
			start: 0,
			end: 0,
			blocks: {}
		};
		this.prevTimestamp = 0;
		this.logger = logger;
		this.logger.createOutputStreams(this.network);
		this.debug = (process.env.DEBUG == true);
		this.fallback = (process.env.FALLBACK == true);

		// use an external fallback provider or local IPC endpoint	
		var providerUrl = this.fallback ? this.options.fallback_provider : this.options.provider;

		this.print("Launching %s watcher, (debug mode: %s)", colors.yellow, this.network, this.debug.toString());
		this.adapter.initProvider(providerUrl, this.fallback).then(()=>this.tick());
	}

	// updates window + checks validity
	async tick(){
		// handling printing ticks 
		var timestamp = Date.now();
		if(timestamp - this.prevTimestamp > this.options.stats_collection_rate || this.debug){
			this.debugPrint("Tick: %s", colors.blue, new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
			this.prevTimestamp = timestamp;

			// get network statistics and log them to the DB
			this.getNetworkStats(this.options.sampleSize);
		}

		// update the window, receiving a new object
		var new_window = await this.updateWindow(this.window_chain);

		// if not first window
		if(this.window_chain.start != 0){
			await this.compareWindows(this.window_chain, new_window);
		}

		this.window_chain = new_window;

		// call function again after refresh period
		var watcher = this;
		setTimeout(function(){watcher.tick()}, this.options.refresh_rate);
	}

	// function updates the window based on whether the chain has progressed since the last tick
	async updateWindow(window){
		this.debugPrint("Updating window (current: %d-%d, size: %d)", colors.green, window.start, window.end, Object.keys(window.blocks).length);

		const latest = await this.adapter.getBlockNumber();

		// update window
		var new_window = {
			start: latest-this.options.window_size+1,
			end: latest,
			blocks: {}
		};

		if(window.start == 0){
			this.print("Initializing window of %d blocks", colors.green, this.options.window_size);
			// form window for entire range
			for(var i=0; i<this.options.window_size; i++){
				let blockNo = latest-i;
				let block = await this.adapter.getBlock(blockNo);
				new_window.blocks[blockNo] = {blockNo: blockNo, miner: block.miner, hash: block.hash};
			}
			this.print("Initialized with %d blocks", colors.green, Object.keys(new_window.blocks).length);
		} else if(window.end == latest) {
			// deep copy
			new_window = JSON.parse(JSON.stringify(window));
			// Potential for a chain reorg (of the same length) here??

			var lastBlock = await this.adapter.getBlock(latest);
			var i = latest;

			// starting from the end, check if still up to date
			while(lastBlock.hash != window.blocks[i].hash){
				// overwrite mismatched blocks
				new_window.blocks[i] = {blockNo: i, miner: lastBlock.miner, hash: lastBlock.hash};
				this.debugPrint("MISMATCH: %d (Chain: %s vs Window: %s)", colors.red, i, lastBlock.hash, window.blocks[i].hash);
				i--;
				lastBlock = await this.adapter.getBlock(i);
			}

			this.debugPrint("Window up-to-date (%d-%d)", colors.green, window.start, window.end);
		} else {
			// Chain has grown, update window by copying old blocks first
			this.debugPrint("Shifting window to: (%d-%d)", colors.green, new_window.start,new_window.end);

			var numCopied = 0;
			for(var blockNo=new_window.start; blockNo<=new_window.end; blockNo++){
				// is in original window
				if(blockNo in window.blocks){
					new_window.blocks[blockNo] = window.blocks[blockNo];
					numCopied++;
				} else {
					var block = await this.adapter.getBlock(blockNo);
					this.debugPrint("Added new entry: %d (Hash: %s)", colors.green, blockNo, block.hash);
					new_window.blocks[blockNo] = {blockNo: blockNo, miner: block.miner, hash: block.hash}
				}
			}
			this.debugPrint("Cloned %d blocks", colors.green, numCopied);
		}
		return new_window;
	}

	async compareWindows(oldWindow, newWindow){
		this.debugPrint("Comparing windows...", colors.blue);

		var startPoint = 0; // technically the last block to start scanning from
		if(oldWindow.end == newWindow.end){
			// scan windows starting from the (same) end
			startPoint = oldWindow.end;
		} else if (newWindow.end > oldWindow.end) {
			// scan windows starting from the end of the old window
			startPoint = oldWindow.end;
		} else {
			// new window is somehow shorter? Almost certainly impossible due to GHOST
			this.print("Window length mismatch, Old:(%d-%d), New:(%d-%d)", colors.red, oldWindow.start, oldWindow.end, newWindow.start, newWindow.end);
		}

		// Scanning previous blocks to see exactly when reorg happened
		var i = startPoint;
		while(oldWindow.blocks[i].hash != newWindow.blocks[i].hash){
			this.print("Hash mismatch: (Old: %s, New: %s)", colors.red, oldWindow.blocks[i].hash, newWindow.blocks[i].hash);
			i--;
		}
		i+=1;

		// Reorg occurred, log to DB
		if(i <= startPoint){
			this.print("Blocks (%d-%d, total: %d) reorg'd!", colors.red, startPoint, i, (startPoint-i+1));
			await this.logger.logReorg(this.network, oldWindow, newWindow, i, startPoint);
		}

		// look through new window for the concentration of miners
		var latest = newWindow.end;
		var confStart = latest - this.options.confRange + 1; 
		var miners = {};
		for(var i=confStart; i<=latest; i++){
			var block = newWindow.blocks[i];
			var m = block.miner;
			if (miners.hasOwnProperty(m)){
				miners[m] = miners[m]+1;
			} else {
				miners[m] = 1;
			}
		}

		// check if there's a miner over 51%
		for(var m in miners){
			if(miners.hasOwnProperty(m)){
				if(miners[m] >= this.options.confRange/2){
					this.print("Over 51% miner density for blocks (%d-%d) for miner %s", colors.red, confStart, latest, m);
					await this.logger.logMinerDensity(this.network, newWindow, confStart, latest, m, miners);
					return;
				}
			}
		}
	}

	/*********************************************************
	* COLOR LEGEND
	* Yellow: Init, Startup
	* Blue: Refresh
	* Green: Window Updates
	* Red: Errors
	**********************************************************/


	debugPrint(str,color, ...args){
		let formatStr = "%s | %s | " + str;
		if(this.debug) console.log(color(formatStr), this.network.toUpperCase(), this.getTimestring(), ...args);
		this.logger.outputToStream(this.network, "debug", util.format(formatStr, this.network.toUpperCase(), this.getTimestring(), ...args) + '\n');
	}

	print(str,color, ...args){
		let formatStr = "%s | %s | " + str;
		console.log(color(formatStr), this.network.toUpperCase(), this.getTimestring(), ...args);
		this.logger.outputToStream(this.network, "output", util.format(formatStr, this.network.toUpperCase(), this.getTimestring(), ...args) + '\n');
	}


	getTimestring(){
		return new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
	}

	/* --------------------------- Utility Functions ------------------------- */

	/* TODO: Add uncle counting */
	async getNetworkStats(sampleSize) {
	    let blockNum = await this.adapter.getBlockNumber(); // Save this value to atomically get a block number.
	    let newestBlock = await this.adapter.getBlock(blockNum);
		let olderBlock = await this.adapter.getBlock(blockNum - sampleSize);
	    let blockTime = (newestBlock.timestamp - olderBlock.timestamp) / sampleSize;
	    let difficulty = newestBlock.difficulty; // You can sum up the last n-blocks and average; this is mathematically sound.

	    var miners = {};
		for(var i=blockNum-sampleSize+1; i<=blockNum; i++){
			var block;
			if(this.window_chain.blocks.hasOwnProperty(i)){
				block = this.window_chain.blocks[i];
			} else {
				block = await this.adapter.getBlock(i);
			}
			
			var m = block.miner;
			if (miners.hasOwnProperty(m)){
				miners[m] = miners[m]+1;
			} else {
				miners[m] = 1;
			}
		}
	    await this.logger.logStatistics(this.network, blockTime, difficulty, Math.round(difficulty/blockTime), miners);
	}	
}
