/* eslint-disable spaced-comment */
/* eslint-disable node/no-unsupported-features/node-builtins */
/* eslint-disable no-var */
/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */

import { expect } from "chai";
import { ethers, network } from "hardhat";

const THREE_DAYS_IN_SECONDS = 60 * 60 * 24 * 3;
const TOKEN_INITIAL_SUPPLY = 1000;
const QUORUM = TOKEN_INITIAL_SUPPLY * 0.7;
const HUNDRED_TOKENS = ethers.utils.parseUnits("100", 0);
const FIFTY_TOKENS = ethers.utils.parseUnits("50", 0);
const JSON_ABI = [{
  "inputs": [{ "internalType": "address", "name": "chair", "type": "address" }],
  "name": "performProposalAction",
  "outputs": [{ "internalType": "bool", "name": "isPerformed", "type": "bool" }],
  "stateMutability": "nonpayable",
  "type": "function"
}];

describe("DAO", async () => {
  let DAO: any, dao: any, DAOToken: any, daoToken: any, DAOAssistant: any, daoAssistant: any;
  let regularUser1: { address: any }, regularUser2: { address: any }, regularUser3: { address: any };
  let signers: any[], chair: any, deployer: any;
  
  beforeEach(async () => {
    [deployer, chair, regularUser1, regularUser2, regularUser3] = await ethers.getSigners();

    DAOAssistant = await ethers.getContractFactory("DAOAssistant");
    daoAssistant = await DAOAssistant.deploy();
    await daoAssistant.deployed();

    DAOToken = await ethers.getContractFactory("DAOToken");
    daoToken = await DAOToken.deploy(TOKEN_INITIAL_SUPPLY, "DAOToken", "DAOT");
    await daoToken.deployed();

    DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(chair.address, daoToken.address, QUORUM, THREE_DAYS_IN_SECONDS);
    await dao.deployed();

    await daoToken.transfer(regularUser1.address, TOKEN_INITIAL_SUPPLY * 0.1);
    await daoAssistant.setDao(dao.address);

    console.log("DAOAssistant: ", daoAssistant.address);
  });
/*
  it("Should make deposit", async () => {
    const amount = 100;
    const balanceBeforeDeposit = await daoToken.balanceOf(regularUser1.address);
    await daoToken.connect(regularUser1).approve(dao.address, amount);
    await dao.connect(regularUser1).deposit(amount);
    const balanceAfterDeposit = await daoToken.balanceOf(regularUser1.address);

    expect(balanceBeforeDeposit.sub(balanceAfterDeposit)).to.be.equal(amount);
    expect(await dao.memberBalances(regularUser1.address)).to.be.equal(HUNDRED_TOKENS);
  });

  it("Should make withdrawal", async () => {
    const amount = 100;
    const amount2 = 50;
    await daoToken.connect(regularUser1).approve(dao.address, amount);
    await dao.connect(regularUser1).deposit(amount);

    const balanceBeforeWithdrawal = await daoToken.balanceOf(regularUser1.address);
    await dao.connect(regularUser1).withdraw(amount2);
    const balanceAfterWithdrawal = await daoToken.balanceOf(regularUser1.address);

    expect(balanceAfterWithdrawal.sub(balanceBeforeWithdrawal)).to.be.equal(amount2);
    expect(await dao.memberBalances(regularUser1.address)).to.be.equal(FIFTY_TOKENS);
  });

  it("Should add proposal", async () => {
    const iface = new ethers.utils.Interface(JSON_ABI);
    const calldata = iface.encodeFunctionData('performProposalAction',[daoAssistant.address]);
    const recipient = daoAssistant.address;
    const description = "Sample call";

    expect(dao.addProposal(calldata, recipient, description))
    .to.be.revertedWith("Only chair can make proposals")
    ;
    await dao.connect(chair).addProposal(calldata, recipient, description);
    expect((await dao.proposals(0)).callBytecode).to.be.equal(calldata);
  });

  it("Should vote", async () => {
    const iface = new ethers.utils.Interface(JSON_ABI);
    const calldata = iface.encodeFunctionData('performProposalAction',[daoAssistant.address]);
    const recipient = daoAssistant.address;
    const description = "Sample call";

    await dao.connect(chair).addProposal(calldata, recipient, description);

    expect(dao.connect(regularUser2).vote(0, true))
    .to.be.revertedWith("Must own at least 1 token to vote")
    ;

    await daoToken.connect(regularUser1).approve(dao.address, 100);
    await dao.connect(regularUser1).deposit(100);
    await dao.connect(regularUser1).vote(0, true);

    const proposal = await dao.proposals(0);
    expect(proposal.votedForTotal).to.be.equal(HUNDRED_TOKENS);
  });
*/
  it("Shoul finish proposal", async () => {
    const iface = new ethers.utils.Interface(JSON_ABI);
    // const iface = new ethers.utils.Interface(
    //   "function performProposalAction(address chair)"
    // );
    const calldata = iface.encodeFunctionData('performProposalAction',
      [daoAssistant.address]
    );
    const recipient = daoAssistant.address;
    const description = "Sample call";

    await dao.connect(chair).addProposal(calldata, recipient, description);

    await daoToken.connect(regularUser1).approve(dao.address, 100);
    await dao.connect(regularUser1).deposit(100);
    await dao.connect(regularUser1).vote(0, true);

    await daoToken.transfer(regularUser2.address, 400);
    await daoToken.connect(regularUser2).approve(dao.address, 400);
    await dao.connect(regularUser2).deposit(400);
    await dao.connect(regularUser2).vote(0, false);

    // before debating period expires
    expect(dao.finishProposal(0))
    .to.be.revertedWith("Too early to finish")
    ;

    // fast forward 3 days
    await network.provider.request({ method: "evm_increaseTime", params: [THREE_DAYS_IN_SECONDS] });
    await network.provider.request({ method: "evm_mine", params: [] });

    // 600 tokens voted, 700 required for quorum
    expect(dao.finishProposal(0))
    .to.be.revertedWith("Not enough tokens voted")
    ;

    await daoToken.transfer(regularUser3.address, 500);
    await daoToken.connect(regularUser3).approve(dao.address, 500);
    await dao.connect(regularUser3).deposit(500);
    await dao.connect(regularUser3).vote(0, true);

    //const proposal = await dao.proposals(0);
    //expect(proposal.votedForTotal).to.be.equal(HUNDRED_TOKENS);
    //console.log(proposal)

    daoAssistant.filters.AssistantTriggered();

    await dao.finishProposal(0);
    const proposal = await dao.proposals(0);
    //console.log(proposal)
  });
});
