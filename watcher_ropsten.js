const config = require('./config.json');
require('dotenv').config();
var colors = require('colors');
const network = "ropsten";
const options = config[network];

const Web3 = require('web3');


/*
* COLOR LEGEND
* Yellow: Init, Startup
* Blue: Updating/Refresh
* Green: Window Changes
* Red: Errors
*/


var web3;
//const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://ropsten.infura.io/ws"));
//const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws"));

var window_chain = {
	start: -1,
	end: -1,
	blocks: {}
};

// placeholder constructor
async function launch(){

	console.log(("Launching in debug mode: " + (process.env.DEBUG == true)).yellow);

	if(process.env.DEBUG){
		console.log("Debug mode: using Infura Web3 Provider".yellow);
		web3 = await new Web3(new Web3.providers.WebsocketProvider("wss://ropsten.infura.io/ws"));
	} else {
		web3 = await new Web3(new Web3.providers.HttpProvider(options.provider));
	}

	tick();
}

// updates window + checks validity
async function tick(){
	console.log("Tick".blue);
	var new_window = await updateWindow(window_chain);
	window_chain = new_window;
	setTimeout(function(){tick()}, options.refresh_rate);
}

// function updates the window based on whether the chain has progressed since the last tick
async function updateWindow(window){
	console.log(colors.green("Updating window, size %d"), options.window_size);
	console.log(("Window num blocks: " + Object.keys(window.blocks).length).green);
	const latest = await web3.eth.getBlockNumber();

	// update window
	var new_window = {
		start: latest-options.window_size+1,
		end: latest,
		blocks: {}
	};

	if(window.start == -1){
		console.log("Init".green);
		// form window for entire range
		for(var i=0; i<options.window_size; i++){
			let blockNo = latest-i;
			let block = await web3.eth.getBlock(blockNo);
			new_window.blocks[blockNo] = {blockNo: blockNo, miner: block.miner, hash: block.hash};
		}
		console.log(colors.green("Initialized with %d blocks"), Object.keys(new_window.blocks).length);
	} else if(window.end == latest) {
		new_window = window;
		// UNcle?????!!
		var lastBlock = await web3.eth.getBlock(latest);
		var i = latest;
		while(lastBlock.hash != window.blocks[i].hash){
			new_window.blocks[i] = {blockNo: i, miner: lastBlock.miner, hash: lastBlock.hash};
			console.log(colors.red("MISMATCH: %d (Chain: %s vs Window: %s)"), i, lastBlock.hash, window.blocks[i].hash);
			i--;
			lastBlock = await web3.eth.getBlock(i);
		}

		console.log(colors.green("Window up-to-date (%d-%d)"), window.start, window.end);
	} else {
		// update window 
		console.log(colors.green("New window: (" + new_window.start + "-" + new_window.end + ")"));
		var numCopied = 0;
		for(var blockNo=new_window.start; blockNo<=new_window.end; blockNo++){
			// is in original window
			if(blockNo in window.blocks){
				new_window.blocks[blockNo] = window.blocks[blockNo];
				numCopied++;
			} else {
				console.log(colors.green("Adding new entry: " + blockNo));
				var block = await web3.eth.getBlock(blockNo);
				new_window.blocks[blockNo] = {blockNo: blockNo, miner: block.miner, hash: block.hash}
			}
		}
		console.log(colors.green("Cloned %d blocks"), numCopied);
	}
	//console.log(new_window);
	return new_window;
}

function compareWindows(oldWindow, newWindow){
	// possibilities:
	// windows are same length (same window.end) -> check last 
	// 
}




/* --------------------------- Utility Functions ------------------------- */

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
}

module.exports.launch = function (){ launch() };