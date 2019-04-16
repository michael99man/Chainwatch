const config = require('./config.json');
require('dotenv').config();
var colors = require('colors');
const Web3 = require('web3');

/*
* COLOR LEGEND
* Yellow: Init, Startup
* Blue: Refresh
* Green: Window Updates
* Red: Errors
*/


module.exports = class Watcher {
	/* 
	getProvider(debug?)
	getBlock(n)
	blockHeight
	
	*/

	constructor(e, n){
		this.engine = e;
		this.network = n;
		this.options = config[this.network];
		this.debug = false;
		this.window_chain = {
			start: 0,
			end: 0,
			blocks: {}
		};
		this.prevTimestamp = 0;

		console.log(("Launching " + this.network + " watcher in debug mode: " + (process.env.DEBUG == true)).yellow);

		if(process.env.DEBUG){
			this.debug = true;
			this.engine.initProvider(this.options.fallback_provider, this.debug).then(()=>this.tick());
		} else {
			this.engine.initProvider(this.options.provider, this.debug).then(()=>this.tick());
		}
	}

	// updates window + checks validity
	async tick(){
		this.debugPrint("Tick",colors.blue);

		// handling printing ticks 
		var timestamp = Date.now();

		if(timestamp - this.prevTimestamp > this.options.tick_rate){
			this.print("Tick: %s", colors.blue, new Date().toLocaleString());
			this.prevTimestamp = timestamp;
		}

		var new_window = await this.updateWindow(this.window_chain);

		// if not first window
		if(this.window_chain.start != -1) this.compareWindows(window_chain, new_window);

		this.window_chain = new_window;
		var watcher = this;
		setTimeout(function(){watcher.tick()}, this.options.refresh_rate);
	}

	// function updates the window based on whether the chain has progressed since the last tick
	async updateWindow(window){
		this.debugPrint("Updating window (current: %d-%d), size: %d", colors.green, window.start, window.end, Object.keys(window.blocks).length);

		const latest = await this.engine.getBlockNumber();

		// update window
		var new_window = {
			start: latest-this.options.window_size+1,
			end: latest,
			blocks: {}
		};

		if(window.start == -1){
			console.log("Init Window".green);
			// form window for entire range
			for(var i=0; i<this.options.window_size; i++){
				let blockNo = latest-i;
				let block = await this.engine.getBlock(blockNo);
				new_window.blocks[blockNo] = {blockNo: blockNo, miner: block.miner, hash: block.hash};
			}
			this.print("Initialized with %d blocks", colors.green, Object.keys(new_window.blocks).length);
		} else if(window.end == latest) {
			new_window = window;
			// Potential for a chain reorg (of the same length) here??

			var lastBlock = await this.engine.getBlock(latest);
			var i = latest;

			// starting from the end, check if still up to date
			while(lastBlock.hash != window.blocks[i].hash){
				// overwrite mismatched blocks
				new_window.blocks[i] = {blockNo: i, miner: lastBlock.miner, hash: lastBlock.hash};
				this.print("MISMATCH: %d (Chain: %s vs Window: %s)", colors.red, i, lastBlock.hash, window.blocks[i].hash);
				i--;
				lastBlock = await this.engine.getBlock(i);
			}

			this.debugPrint("Window up-to-date (%d-%d)", colors.green, window.start, window.end);
		} else {
			// Chain has grown, update window by copying old blocks first
			if(this.debug) console.log(colors.green("Shifting window to: (" + new_window.start + "-" + new_window.end + ")"));
			var numCopied = 0;
			for(var blockNo=new_window.start; blockNo<=new_window.end; blockNo++){
				// is in original window
				if(blockNo in window.blocks){
					new_window.blocks[blockNo] = window.blocks[blockNo];
					numCopied++;
				} else {
					var block = await this.engine.getBlock(blockNo);
					this.debugPrint("Added new entry: %d (Hash: %s)", colors.green, blockNo, block.hash);
					new_window.blocks[blockNo] = {blockNo: blockNo, miner: block.miner, hash: block.hash}
				}
			}
			if(this.debug) console.log(colors.green("Cloned %d blocks"), numCopied);
		}
		return new_window;
	}

	compareWindows(oldWindow, newWindow){
		// possibilities:
		// windows are same length (same window.end) -> check last 
		// 
		if(this.debug) console.log(colors.blue("Comparing windows"));

		var startPoint = -1;
		if(oldWindow.end == newWindow.end){
			// scan windows starting from the end
			startPoint = oldWindow.end;
		} else if (newWindow.end > oldWindow.end) {
			startPoint = oldWindow.end;
		} else {
			console.log(colors.red("Window length mismatch, Old:(%d-%d), New:(%d-%d)"), oldWindow.start, oldWindow.end, newWindow.start, newWindow.end);
		}

		var i = startPoint;
		while(oldWindow.blocks[i].hash != newWindow.blocks[i].hash){
			console.log(colors.red("Hash mismatch: (%d, %d)"))
			i--;
		}


		// Scanning previous blocks to see exactly when reorg happened?

	}

	debugPrint(str,color, ...args){
		if(!this.debug) return;

		this.print(str, color, ...args);
	}

	print(str,color, ...args){
		console.log(color(str), ...args);
	}




	/* --------------------------- Utility Functions ------------------------- */

	/*
	async function calculateDistribution(numBlocks){
		let miners = {};

		const latest = await web3.eth.getBlockNumber();
		console.log("Block Height: " + latest);

		for(var i=0; i<numBlocks; i++){
			let blockNo = latest-i;
			let block = await web3.eth.getBlock(blockNo);	

			let miner = block.miner;

			// tally the miners
			if(miner in miners){
				miners[miner]++;
			} else {
				miners[miner] = 1;
			}

			console.log(blockNo, miner);
		}

		console.log(miners);
		return miners;
	}

	async function getNetworkStats(
	        sampleSize //!< [in] Larger n give more accurate numbers but with longer latency.
	    ) {
	    blockNum = await web3.eth.getBlockNumber(); // Save this value to atomically get a block number.
	    console.log(blockNum);
	    recentBlock = await web3.eth.getBlock(blockNum);
	    olderBlock = await web3.eth.getBlock(blockNum - sampleSize);
	    blockTime = (recentBlock.timestamp - olderBlock.timestamp) / sampleSize;
	    difficulty = recentBlock.difficulty; // You can sum up the last n-blocks and average; this is mathematically sound.

	    console.log({
	      "blocktime": blockTime,
	      "difficulty": difficulty,
	      "hashrate": difficulty / blockTime,
	    });
	}*/
}