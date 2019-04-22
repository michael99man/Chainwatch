const Web3 = require('web3');

module.exports = class Ropsten {

	constructor(){
		this.network = "ropsten";
	}

	async initProvider(url, fallback){
		if(fallback){
			console.log("Fallback mode: using Infura Web3 Provider".yellow);
			this.web3 = await new Web3(new Web3.providers.WebsocketProvider(url));
		} else {
			this.web3 = await new Web3(new Web3.providers.HttpProvider(url));
		}
	}

	async getBlockNumber(){
		return this.web3.eth.getBlockNumber();
	}

	async getBlock(n){
		var b = await this.web3.eth.getBlock(n);

		var block = {};
		block.blockNo = n;
		block.miner = b.miner;
		block.hash = b.hash;
		block.timestamp = b.timestamp;
		block.difficulty = b.difficulty;
		return block;
	}
}