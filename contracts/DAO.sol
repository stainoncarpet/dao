//SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract DAO is Ownable {
    address public chairPerson;
    address public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    mapping(address => uint256) memberBalances;

    struct Proposal {
        bytes callBytecode;
        // address recipient
        string description;
        mapping(address => uint256) votes;
        uint256 startedAt;
    }

    Proposal[] public proposals;

    modifier onlyChair() {
        require(msg.sender == chairPerson, "Only chair can make proposals");
        _;
    }

    constructor(address _chairPerson, address _voteToken, uint256 _minimumQuorum, uint256 _debatingPeriodDuration) {
        chairPerson = _chairPerson;
        voteToken = _voteToken;
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function deposit(uint256 amount) external pure {
        voteToken.call{value:0}(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount));
    }

    function withdraw(uint256 amount) external pure {
        uint256 balance = memberBalances[msg.sender];
        require(balance >= amount, "Amount exceeds balance");

        // check if user is participating in ongoing proposals
        for (uint256 i = 0; i < proposals.length; i++) {
           if(proposals[i].votes[msg.sender] > 0){
               revert("Can't withdraw while participating in ongoing proposals");
           } 
        }

        memberBalances[msg.sender] -= amount;
        voteToken.call{value:0}(abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount));
    }

    function addProposal(bytes callData, address recipient, bytes description) external onlyChair {
        Proposal memory proposal = Proposal(

        );
    }

    function vote(uint256 id, uint256 supoportAgainst) external {
        require(memberBalances[msg.sender] > 0, "Must own at least 1 token to vote");
        require(proposals[id].votes[msg.sender] < memberBalances[msg.sender], "Voting points exceeded");
        require(proposals[id].votes[msg.sender] + supoportAgainst <= memberBalances[msg.sender], "Voting points exceeded");
        proposals[id].votes[msg.sender] += supoportAgainst;
    }

    function finishProposal(uint256 id) external {
        require(block.timestamp >= proposals[id].startedAt + debatingPeriodDuration, "Too early to finish");
        // call by selector
        // delete proposal
    }
}
