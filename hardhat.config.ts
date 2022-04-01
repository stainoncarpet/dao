/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
import * as dotenv from "dotenv";
import * as ethers from "ethers";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ETHERSCAN_API_KEY: string;
      ALCHEMY_KEY: string;
      METAMASK_PRIVATE_KEY: string;
      METAMASK_PUBLIC_KEY: string;
      COINMARKETCAP_API_KEY: string;
      RINKEBY_URL: string;
      RINKEBY_WS: string;
    }
  }
}

export const TOKEN_NAME = "DAOToken";
export const TOKEN_SYMBOL = "DAOT";
export const THREE_DAYS_IN_SECONDS = 60 * 60 * 24 * 3;
export const TOKEN_INITIAL_SUPPLY = 1001;
export const QUORUM = 700;
export const HUNDRED_TOKENS = ethers.utils.parseUnits("100", 0);
export const FIFTY_TOKENS = ethers.utils.parseUnits("50", 0);
export const JSON_ABI = [{
  "inputs": [{ "internalType": "address", "name": "chair", "type": "address" }],
  "name": "performProposalAction",
  "outputs": [{ "internalType": "bool", "name": "isPerformed", "type": "bool" }],
  "stateMutability": "nonpayable",
  "type": "function"
}];

task("vote", "Vote for or against a proposition")
  .addParam("addressd", "Address of DAO contract")
  .addParam("propid", "Proposal id")
  .addParam("supportagainst", "For or against")
  .setAction(async (taskArguments, hre) => {
    const daoContractSchema = require("./artifacts/contracts/DAO.sol/DAO.json");

    const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
    const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
    const dao = new hre.ethers.Contract(taskArguments.addressd, daoContractSchema.abi, walletOwner);

    const voteTx = await dao.vote(taskArguments.propid, taskArguments.supportagainst);

    console.log("Receipt: ", voteTx);
  })
;

task("addprop", "Submit proposal to DAO")
  .addParam("addressd", "Address of DAO contract")
  .addParam("addressa", "Address of DAOAssistant contract")
  .addParam("description", "Proposal description")
  .setAction(async (taskArguments, hre) => {
      const daoContractSchema = require("./artifacts/contracts/DAO.sol/DAO.json");

      const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
      const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
      const dao = new hre.ethers.Contract(taskArguments.addressd, daoContractSchema.abi, walletOwner);

      const iface = new ethers.utils.Interface(JSON_ABI);
      const calldata = iface.encodeFunctionData('performProposalAction',[taskArguments.addressa]);
      const recipient = taskArguments.addressa;
      const description = taskArguments.description;

      const addProposalTx = await dao.addProposal(calldata, recipient, description);

      console.log("Receipt: ", addProposalTx);
  })
;

task("finish", "Finish proposal")
  .addParam("addressd", "Address of DAO contract")
  .addParam("propid", "Proposal id")
  .setAction(async (taskArguments, hre) => {
    const daoContractSchema = require("./artifacts/contracts/DAO.sol/DAO.json");

    const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
    const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
    const dao = new hre.ethers.Contract(taskArguments.addressd, daoContractSchema.abi, walletOwner);

    const depositTx = await dao.finishProposal(taskArguments.propid);

    console.log("Receipt: ", depositTx);
})
;

task("deposit", "Deposit")
  .addParam("addressd", "Address of DAO contract")
  .addParam("amount", "Amount to deposit")
  .setAction(async (taskArguments, hre) => {
      const daoContractSchema = require("./artifacts/contracts/DAO.sol/DAO.json");

      const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
      const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
      const dao = new hre.ethers.Contract(taskArguments.addressd, daoContractSchema.abi, walletOwner);

      const depositTx = await dao.deposit(taskArguments.amount);

      console.log("Receipt: ", depositTx);
  })
;

const config: HardhatUserConfig = {
  solidity: "0.8.11",
  networks: {
    rinkeby: {
      url: process.env.RINKEBY_URL,
      accounts: [process.env.METAMASK_PRIVATE_KEY],
      gas: 2100000,
      gasPrice: 8000000000
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
