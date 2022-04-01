// SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract DAO is Ownable {
    address public chairPerson;
    address public voteToken;
    uint256 public minimumQuorum; // measured in tokens, e.g. 70% of all existing tokens
    uint256 public debatingPeriodDuration; // e.g. 3 days
    mapping(address => uint256) public memberBalances;
    mapping(address => uint256[]) public memberParticipation;

    struct Proposal {
        uint256 startedAt;
        uint256 votedForTotal;
        uint256 votedAgainstTotal;
        string description;
        bytes callBytecode;
        address recipient;
        bool isFinished;
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

    function deposit(uint256 amount) external {
        (bool success, bytes memory data) = voteToken.call{value:0}(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount));
        require(success, "Deposit failed");
        memberBalances[msg.sender] = amount;
    }

    function withdraw(uint256 amount) external {
        uint256 balance = memberBalances[msg.sender];
        require(balance >= amount, "Amount exceeds balance");

        // check if user is participating in ongoing proposals
        // for (uint256 i = 0; i < proposals.length; i++) {
        //    if(proposals[i].votesByAddress[msg.sender] > 0){
        //        revert("Can't withdraw while participating in ongoing proposals");
        //    } 
        // }

        require(memberParticipation[msg.sender].length == 0, "Can't withdraw while participating in ongoing proposals");

        memberBalances[msg.sender] -= amount;
        voteToken.call{value:0}(abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount));
    }

    function addProposal(bytes calldata callData, address recipient, string calldata description) external onlyChair {
        Proposal memory proposal = Proposal({
            startedAt: block.timestamp,
            votedForTotal: 0,
            votedAgainstTotal: 0,
            description: description,
            callBytecode: callData,
            recipient: recipient,
            isFinished: false
        });

        proposals.push(proposal);
    }

    function vote(uint256 id, bool supportAgainst) external {
        require(memberBalances[msg.sender] > 0, "Must own at least 1 token to vote");

        //require(proposals[id].votesByAddress[msg.sender] == 0, "Already voted");
        for (uint256 i = 0; i < memberParticipation[msg.sender].length; i++) {
            if(memberParticipation[msg.sender][i] == id){
                revert("Already voted");
            }
        }

        require(!proposals[id].isFinished, "Unable to vote: Proposal is finished");

        if(supportAgainst) {
            //proposals[id].votesByAddress[msg.sender] = memberBalances[msg.sender];
            proposals[id].votedForTotal += memberBalances[msg.sender];
        } else {
            //proposals[id].votesByAddress[msg.sender] = memberBalances[msg.sender];
            proposals[id].votedAgainstTotal += memberBalances[msg.sender];
        }
        memberParticipation[msg.sender].push(id);
    }

    function finishProposal(uint256 id) external {
        require(block.timestamp >= proposals[id].startedAt + debatingPeriodDuration, "Too early to finish");
        require(proposals[id].votedForTotal + proposals[id].votedAgainstTotal >= minimumQuorum, "Not enough tokens voted");

        uint256 votedForTotalPercentage = (proposals[id].votedForTotal * 100) / (proposals[id].votedAgainstTotal + proposals[id].votedForTotal);

        require(votedForTotalPercentage >= 51, "Proposal hasn't been passed");
        // (bool success, ) = proposals[id].recipient.call{value:0}(
        //     proposals[id].callBytecode
        // );

        console.log(proposals[0].recipient);

        (proposals[0].recipient).call(abi.encodeWithSignature("performProposalAction(address)", chairPerson));

        proposals[id].isFinished = true;
    }

    function destroyContract() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
