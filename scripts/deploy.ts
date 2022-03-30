/* eslint-disable prettier/prettier */

import { ethers } from "hardhat";

const main = async () => {
  const DAOToken = await ethers.getContractFactory("DAOToken");
  const daoToken = await DAOToken.deploy();
  await daoToken.deployed();
  
  const DAOAssistant = await ethers.getContractFactory("DAOAssistant");
  const daoAssistant = await DAOAssistant.deploy();
  await daoAssistant.deployed();

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();
  await dao.deployed();

  console.log("Greeter deployed to:", daoToken.address, "by", daoToken.signer.getAddress());
  console.log("Greeter deployed to:", daoAssistant.address, "by", daoAssistant.signer.getAddress());
  console.log("Greeter deployed to:", dao.address, "by", dao.signer.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
