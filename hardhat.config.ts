/* eslint-disable prettier/prettier */
import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

task("vote", "")
  .addParam("", "")
  .setAction(async (taskArguments, hre) => {
      const contractSchema = require("./artifacts/contracts/Bridge.sol/Bridge.json");

      const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
      const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
      const bridge = new hre.ethers.Contract(taskArguments.bridge, contractSchema.abi, walletOwner);

      const providerETH = new hre.ethers.providers.WebSocketProvider(process.env.RINKEBY_WS);
      const providerBNB = new hre.ethers.providers.WebSocketProvider(process.env.BSCTEST_WS);
      const filter = bridge.filters.swapFinalized(
        process.env.METAMASK_PUBLIC_KEY, taskArguments.token, null, null, null, null, null
      );
      providerETH.on(filter, (event) => console.log("[ETH] Swap finalized event:", event));
      providerBNB.on(filter, (event) => console.log("[BSC] Swap finalized event:", event));

      const swapTx = await bridge.redeem(
        taskArguments.token, 
        taskArguments.amount, 
        taskArguments.chainfrom,
        taskArguments.chainto,
        taskArguments.nonce,
        taskArguments.symbol
      );

      console.log("Receipt: ", swapTx);
  })
;

task("addproposal", "")
  .addParam("", "")
  .setAction(async (taskArguments, hre) => {
      const contractSchema = require("./artifacts/contracts/Bridge.sol/Bridge.json");

      const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
      const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
      const bridge = new hre.ethers.Contract(taskArguments.bridge, contractSchema.abi, walletOwner);

      const providerETH = new hre.ethers.providers.WebSocketProvider(process.env.RINKEBY_WS);
      const providerBNB = new hre.ethers.providers.WebSocketProvider(process.env.BSCTEST_WS);
      const filter = bridge.filters.swapFinalized(
        process.env.METAMASK_PUBLIC_KEY, taskArguments.token, null, null, null, null, null
      );
      providerETH.on(filter, (event) => console.log("[ETH] Swap finalized event:", event));
      providerBNB.on(filter, (event) => console.log("[BSC] Swap finalized event:", event));

      const swapTx = await bridge.redeem(
        taskArguments.token, 
        taskArguments.amount, 
        taskArguments.chainfrom,
        taskArguments.chainto,
        taskArguments.nonce,
        taskArguments.symbol
      );

      console.log("Receipt: ", swapTx);
  })
;

task("finish", "")
  .addParam("", "")
  .setAction(async (taskArguments, hre) => {
      const contractSchema = require("./artifacts/contracts/Bridge.sol/Bridge.json");

      const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
      const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
      const bridge = new hre.ethers.Contract(taskArguments.bridge, contractSchema.abi, walletOwner);

      const providerETH = new hre.ethers.providers.WebSocketProvider(process.env.RINKEBY_WS);
      const providerBNB = new hre.ethers.providers.WebSocketProvider(process.env.BSCTEST_WS);
      const filter = bridge.filters.swapFinalized(
        process.env.METAMASK_PUBLIC_KEY, taskArguments.token, null, null, null, null, null
      );
      providerETH.on(filter, (event) => console.log("[ETH] Swap finalized event:", event));
      providerBNB.on(filter, (event) => console.log("[BSC] Swap finalized event:", event));

      const swapTx = await bridge.redeem(
        taskArguments.token, 
        taskArguments.amount, 
        taskArguments.chainfrom,
        taskArguments.chainto,
        taskArguments.nonce,
        taskArguments.symbol
      );

      console.log("Receipt: ", swapTx);
  })
;

task("deposit", "")
  .addParam("", "")
  .setAction(async (taskArguments, hre) => {
      const contractSchema = require("./artifacts/contracts/Bridge.sol/Bridge.json");

      const alchemyProvider = new hre.ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHEMY_KEY);
      const walletOwner = new hre.ethers.Wallet(process.env.METAMASK_PRIVATE_KEY, alchemyProvider);
      const bridge = new hre.ethers.Contract(taskArguments.bridge, contractSchema.abi, walletOwner);

      const providerETH = new hre.ethers.providers.WebSocketProvider(process.env.RINKEBY_WS);
      const providerBNB = new hre.ethers.providers.WebSocketProvider(process.env.BSCTEST_WS);
      const filter = bridge.filters.swapFinalized(
        process.env.METAMASK_PUBLIC_KEY, taskArguments.token, null, null, null, null, null
      );
      providerETH.on(filter, (event) => console.log("[ETH] Swap finalized event:", event));
      providerBNB.on(filter, (event) => console.log("[BSC] Swap finalized event:", event));

      const swapTx = await bridge.redeem(
        taskArguments.token, 
        taskArguments.amount, 
        taskArguments.chainfrom,
        taskArguments.chainto,
        taskArguments.nonce,
        taskArguments.symbol
      );

      console.log("Receipt: ", swapTx);
  })
;

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
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
