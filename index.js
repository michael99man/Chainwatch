const Web3 = require('web3');

//const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
//const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://ropsten.infura.io/ws"));
const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws"));

calculateDistribution(100);


//https://ropsten.etherscan.io/stat/miner/1?range=1&blocktype=blocks

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