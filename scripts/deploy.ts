/* eslint-disable node/no-missing-import */
/* eslint-disable prettier/prettier */

import { ethers } from "hardhat";
import { QUORUM, THREE_DAYS_IN_SECONDS, TOKEN_INITIAL_SUPPLY, TOKEN_NAME, TOKEN_SYMBOL } from "../hardhat.config";

const main = async () => {
  const DAOToken = await ethers.getContractFactory("DAOToken");
  const daoToken = await DAOToken.deploy(TOKEN_INITIAL_SUPPLY, TOKEN_NAME, TOKEN_SYMBOL);
  await daoToken.deployed();

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(process.env.METAMASK_PUBLIC_KEY, daoToken.address, QUORUM, THREE_DAYS_IN_SECONDS);
  await dao.deployed();
  
  const DAOAssistant = await ethers.getContractFactory("DAOAssistant");
  const daoAssistant = await DAOAssistant.deploy(dao.address);
  await daoAssistant.deployed();

  console.log("DAOToken deployed to:", daoToken.address, "by", await daoToken.signer.getAddress());
  console.log("DAOAssistant deployed to:", daoAssistant.address, "by", await daoAssistant.signer.getAddress());
  console.log("DAO deployed to:", dao.address, "by", await dao.signer.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
