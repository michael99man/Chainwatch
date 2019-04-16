const config = require('./config.json');
require('dotenv').config();
var colors = require('colors');
const network = "ropsten";
const options = config[network];

const Web3 = require('web3');


module.exports = class Ropsten {

	async initProvider(url, debug){
		if(debug){
			console.log("Debug mode: using Infura Web3 Provider".yellow);
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
		return block;
	}


}