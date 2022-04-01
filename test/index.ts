/* eslint-disable node/no-missing-import */
/* eslint-disable spaced-comment */
/* eslint-disable node/no-unsupported-features/node-builtins */
/* eslint-disable no-var */
/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { FIFTY_TOKENS, HUNDRED_TOKENS, JSON_ABI, QUORUM, THREE_DAYS_IN_SECONDS, TOKEN_INITIAL_SUPPLY, TOKEN_NAME, TOKEN_SYMBOL } from "../hardhat.config";

describe("DAO", async () => {
  let DAO: any, dao: any, DAOToken: any, daoToken: any, DAOAssistant: any, daoAssistant: any;
  let regularUser1: { address: any }, regularUser2: { address: any }, regularUser3: { address: any }, regularUser4: { address: any };
  let signers: any[], chair: any, deployer: any;
  
  beforeEach(async () => {
    [deployer, chair, regularUser1, regularUser2, regularUser3, regularUser4] = await ethers.getSigners();

    DAOToken = await ethers.getContractFactory("DAOToken");
    daoToken = await DAOToken.deploy(TOKEN_INITIAL_SUPPLY, TOKEN_NAME, TOKEN_SYMBOL);
    await daoToken.deployed();

    DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(chair.address, daoToken.address, QUORUM, THREE_DAYS_IN_SECONDS);
    await dao.deployed();

    DAOAssistant = await ethers.getContractFactory("DAOAssistant");
    daoAssistant = await DAOAssistant.deploy(dao.address);
    await daoAssistant.deployed();

    await daoToken.transfer(regularUser1.address, 100);
  });

  it("Should return decimals", async () => {
    expect(await daoToken.decimals()).to.be.equal(0);
  });

  it("Should only dao", async () => {
    await expect(daoAssistant.connect(regularUser1).performProposalAction(chair.address))
    .to.be.revertedWith("Only DAO can perform this action")
    ;
  });

  it("Should get destroyed", async () => {
    expect(await dao.owner()).to.equal(deployer.address);
    expect(await daoAssistant.owner()).to.equal(deployer.address);
    expect(await daoToken.owner()).to.equal(deployer.address);

    await expect(dao.connect(chair).destroyContract()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(daoAssistant.connect(chair).destroyContract()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(daoToken.connect(chair).destroyContract()).to.be.revertedWith("Ownable: caller is not the owner");

    await dao.destroyContract();
    await daoAssistant.destroyContract();
    await daoToken.destroyContract();

    await expect(dao.owner()).to.be.reverted;
    await expect(daoAssistant.owner()).to.be.reverted;
    await expect(daoToken.owner()).to.be.reverted;
  });

  it("Should make deposit", async () => {
    const amount = 100;
    const balanceBeforeDeposit = await daoToken.balanceOf(regularUser1.address);
    // try to deposit without giving dao approval to spend
    await expect(dao.connect(regularUser1).deposit(amount))
    .to.be.revertedWith("Deposit unsuccessful")
    ;
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

  it("Should finish proposal (most voted for)", async () => {
    const iface = new ethers.utils.Interface(JSON_ABI);
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

    //600 tokens voted, 700 required for quorum
    expect(dao.finishProposal(0))
    .to.be.revertedWith("Not enough tokens voted")
    ;

    const user3Deposit = 500;
    await daoToken.transfer(regularUser3.address, user3Deposit);
    await daoToken.connect(regularUser3).approve(dao.address, user3Deposit);
    await dao.connect(regularUser3).deposit(user3Deposit);
    await dao.connect(regularUser3).vote(0, true);

    // shouldn't be able to vote more than once
    await expect(dao.connect(regularUser3).vote(0, true))
    .to.be.revertedWith("Already voted")
    ;

    // shouldn't be able to withdraw until voting finishes
    await expect(dao.connect(regularUser3).withdraw(150))
    .to.be.revertedWith("Can't withdraw while participating in ongoing proposals")
    ;

    const finalizedProposalsCountBefore = await daoAssistant.finalizedProposalsCount();
    await dao.finishProposal(0);
    const finalizedProposalsCountAfter = await daoAssistant.finalizedProposalsCount();
    const proposal = await dao.proposals(0);
    expect(proposal.isFinished).to.be.equal(true);
    // bytecode execution counter must have been incremented since code was executed
    expect(finalizedProposalsCountAfter.sub(finalizedProposalsCountBefore)).to.be.equal(1);

    // shouldn't be able to withdraw more than balance
    await expect(dao.connect(regularUser3).withdraw(600))
    .to.be.revertedWith("Amount exceeds balance")
    ;

    // should be able to withdraw after voting finishes
    const user3Withdraw = 100;
    await dao.connect(regularUser3).withdraw(100);
    const user3BalanceAfterWithdrawal = await dao.memberBalances(regularUser3.address);
    expect(user3Deposit - user3Withdraw).to.be.equal(parseInt(ethers.utils.formatUnits(user3BalanceAfterWithdrawal, 0)));
  
    // shouldn't be able to vote after voting is finished
    const user4Deposit = 1;
    await daoToken.transfer(regularUser3.address, user4Deposit);
    await daoToken.connect(regularUser3).approve(dao.address, user4Deposit);
    await dao.connect(regularUser3).deposit(user4Deposit);
    await expect(dao.connect(regularUser3).vote(0, true))
    .to.be.revertedWith("Voting is no longer possible")
    ;
  });

  it("Should finish proposal (most voted against)", async () => {
    const iface = new ethers.utils.Interface(JSON_ABI);
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

    // fast forward 3 days
    await network.provider.request({ method: "evm_increaseTime", params: [THREE_DAYS_IN_SECONDS] });
    await network.provider.request({ method: "evm_mine", params: [] });

    const user3Deposit = 500;
    await daoToken.transfer(regularUser3.address, user3Deposit);
    await daoToken.connect(regularUser3).approve(dao.address, user3Deposit);
    await dao.connect(regularUser3).deposit(user3Deposit);
    await dao.connect(regularUser3).vote(0, false);

    const finalizedProposalsCountBefore = await daoAssistant.finalizedProposalsCount();
    await dao.finishProposal(0);
    const finalizedProposalsCountAfter = await daoAssistant.finalizedProposalsCount();
    const proposal = await dao.proposals(0);
    expect(proposal.isFinished).to.be.equal(true);
    // count must not have changed since bytecode wasn't executed by external contract
    expect(finalizedProposalsCountBefore).to.be.equal(finalizedProposalsCountAfter);

    // should be able to withdraw after voting finishes
    const user3Withdraw = 100;
    await dao.connect(regularUser3).withdraw(100);
    const user3BalanceAfterWithdrawal = await dao.memberBalances(regularUser3.address);
    expect(user3Deposit - user3Withdraw).to.be.equal(parseInt(ethers.utils.formatUnits(user3BalanceAfterWithdrawal, 0)));
  });
});