/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
import { expect } from "chai";
import { ethers } from "hardhat";

const THREE_DAYS_IN_SECONDS = 60 * 60 * 24 * 3;
const QUORUM = 500;

describe("DAO", async () => {
  let DAO: any, dao: any, DAOToken: any, daoToken: any, DAOAssistant: any, daoAssistant: any;
  let regularUser1: { address: any }, deployer: any;
  let signers: any[], chair: any;
  
  beforeEach(async () => {
    [deployer, chair, regularUser1] = await ethers.getSigners();

    DAOAssistant = await ethers.getContractFactory("DAOAssistant");
    daoAssistant = await DAOAssistant.deploy();
    await daoAssistant.deployed();

    DAOToken = await ethers.getContractFactory("DAOToken");
    daoToken = await DAOToken.deploy(1000, "DAOToken", "DAOT");
    await daoToken.deployed();

    DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(chair.address, daoToken.address, QUORUM, THREE_DAYS_IN_SECONDS);
    await dao.deployed();

    await daoToken.transfer(regularUser1.address, 1000);
  });

  it("Should", async () => {
    await daoToken.connect(regularUser1).approve(dao.address, 100);
    await dao.connect(regularUser1).deposit(100);
  });
});
