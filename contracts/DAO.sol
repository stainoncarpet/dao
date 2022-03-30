// SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract DAO is Ownable {
    address public chairPerson;
    address public voteToken;
    uint256 public minimumQuorum; // measured in tokens, e.g. 70% of all existing tokens
    uint256 public debatingPeriodDuration; // e.g. 3 days
    mapping(address => uint256) memberBalances;

    struct Proposal {
        uint256 startedAt;
        uint256 votedForTotal;
        uint256 votedAgainstTotal;
        bytes description;
        bytes callBytecode;
        address recipient;
        mapping(address => uint256) votesByAddress;
    }

    Proposal[] public activeProposals;

    modifier onlyChair() {
        require(msg.sender == chairPerson, "Only chair can make activeProposals");
        _;
    }

    modifier onlyDao() {
        require(msg.sender == address(this), "Only DAO can perform this action");
        _;
    }

    constructor(address _chairPerson, address _voteToken, uint256 _minimumQuorum, uint256 _debatingPeriodDuration) {
        chairPerson = _chairPerson;
        voteToken = _voteToken;
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function deposit(uint256 amount) external {
        (bool success, bytes memory data) = voteToken.call{value:0}(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount));
        require(success, "Deposit failed");
        memberBalances[msg.sender] = amount;
    }

    function withdraw(uint256 amount) external {
        uint256 balance = memberBalances[msg.sender];
        require(balance >= amount, "Amount exceeds balance");

        // check if user is participating in ongoing activeProposals
        for (uint256 i = 0; i < activeProposals.length; i++) {
           if(activeProposals[i].votesByAddress[msg.sender] > 0){
               revert("Can't withdraw while participating in ongoing activeProposals");
           } 
        }

        memberBalances[msg.sender] -= amount;
        voteToken.call{value:0}(abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount));
    }

    // адрес конгтракта на котором мы исполним это предложение
    function addProposal(bytes calldata callData, address recipient, bytes calldata description) external onlyChair {
        Proposal storage proposal = activeProposals[activeProposals.length];
        proposal.startedAt = block.timestamp;
        proposal.votedForTotal = 0;
        proposal.votedAgainstTotal = 0;
        proposal.description = description;
        proposal.callBytecode = callData;
        proposal.recipient = recipient;
    }

    function vote(uint256 id, bool supportAgainst) external {
        require(memberBalances[msg.sender] > 0, "Must own at least 1 token to vote");
        require(activeProposals[id].votesByAddress[msg.sender] == 0, "Already voted");

        if(supportAgainst) {
            activeProposals[id].votesByAddress[msg.sender] = memberBalances[msg.sender];
            activeProposals[id].votedForTotal = memberBalances[msg.sender];
        } else {
            activeProposals[id].votesByAddress[msg.sender] = memberBalances[msg.sender];
            activeProposals[id].votedAgainstTotal = memberBalances[msg.sender];
        }
    }

    function finishProposal(uint256 id) external {
        require(block.timestamp >= activeProposals[id].startedAt + debatingPeriodDuration, "Too early to finish");
        require(activeProposals[id].votedForTotal + activeProposals[id].votedAgainstTotal >= minimumQuorum, "Not enough tokens voted");

        uint256 votedForTotalPercentage = (activeProposals[id].votedForTotal * 100) / (activeProposals[id].votedAgainstTotal + activeProposals[id].votedForTotal);

        require(votedForTotalPercentage >= 51, "Proposal hasn't been passed");
        activeProposals[id].recipient.call{value:0}(activeProposals[id].callBytecode);
        delete activeProposals[id];
    }

    function destroyContract() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
