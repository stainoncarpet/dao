// SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DAO is Ownable {
    address public chairPerson;
    address public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    mapping(address => uint256) public memberBalances;

    mapping(uint256 => address[]) votersOf;
    mapping(address => uint256) public memberCurrentParticipationCount;
    mapping(address => mapping(uint256 => bool)) public memberCurrentParticipationRegistry;

    event Deposit(address indexed depositor, uint256 indexed amount);
    event Withdrawal(address indexed withdrawer, uint256 indexed amount);
    event ProposalAdded(uint256 indexed id, string indexed description);
    event Vote(uint256 indexed proposalId, bool indexed isVoteFor, address indexed voter);
    event ProposalFinished(uint256 indexed id, string indexed description, bool indexed isPassed);

    struct Proposal {
        uint256 startedAt;
        uint256 votedForTotal;
        uint256 votedAgainstTotal;
        string description;
        bytes callBytecode;
        address recipient;
        bool isFinished;
        bool isSuccessful;
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
        (bool success, bytes memory data) = voteToken.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount));
        if(success) { 
            memberBalances[msg.sender] += amount; 
            emit Deposit(msg.sender, amount);
        } else { revert("Deposit unsuccessful"); }
    }

    function withdraw(uint256 amount) external {
        require(memberBalances[msg.sender] >= amount, "Amount exceeds balance");
        require(memberCurrentParticipationCount[msg.sender] == 0, "Can't withdraw while participating in ongoing proposals");

        (bool success, ) = voteToken.call{value:0}(abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount));
        if(success) { 
            memberBalances[msg.sender] -= amount; 
            emit Withdrawal(msg.sender, amount);
        } else { revert("Withdrawal unsuccessful"); }
    }

    function addProposal(bytes calldata callData, address recipient, string calldata description) external onlyChair {
        Proposal memory proposal = Proposal({
            startedAt: block.timestamp,
            votedForTotal: 0,
            votedAgainstTotal: 0,
            description: description,
            callBytecode: callData,
            recipient: recipient,
            isFinished: false,
            isSuccessful: false
        });

        proposals.push(proposal);
        emit ProposalAdded(proposals.length - 1, description);
    }

    function vote(uint256 id, bool supportAgainst) external {
        require(!proposals[id].isFinished || block.timestamp <= proposals[id].startedAt + debatingPeriodDuration, "Voting is no longer possible");
        require(memberBalances[msg.sender] > 0, "Must own at least 1 token to vote");
        require(!memberCurrentParticipationRegistry[msg.sender][id], "Already voted");

        supportAgainst 
            ? proposals[id].votedForTotal += memberBalances[msg.sender] 
            : proposals[id].votedAgainstTotal += memberBalances[msg.sender]
        ;

        memberCurrentParticipationRegistry[msg.sender][id] = true;
        memberCurrentParticipationCount[msg.sender]++;
        votersOf[id].push(msg.sender);

        emit Vote(id, supportAgainst, msg.sender);
    }

    function finishProposal(uint256 id) external {
        require(!proposals[id].isFinished, "Voting within proposal is no longer allowed");
        require(block.timestamp >= proposals[id].startedAt + debatingPeriodDuration, "Too early to finish");

        if(proposals[id].votedForTotal + proposals[id].votedAgainstTotal < minimumQuorum) {
            proposals[id].isSuccessful = false;
            proposals[id].isFinished = true;
            revert("Not enough tokens voted");
        }

        uint256 votedForTotalPercentage = (proposals[id].votedForTotal * 100) / (proposals[id].votedAgainstTotal + proposals[id].votedForTotal);

        if(votedForTotalPercentage >= 51) { 
            proposals[id].recipient.call(proposals[id].callBytecode);
            proposals[id].isSuccessful = true;
            emit ProposalFinished(id, proposals[id].description, true);
        } else {
            emit ProposalFinished(id, proposals[id].description, false);
        }
        proposals[id].isFinished = true;

        // update participation data
        for (uint256 i = 0; i < votersOf[id].length; i++) {
            memberCurrentParticipationCount[votersOf[id][i]]--;
            memberCurrentParticipationRegistry[votersOf[id][i]][id] = false;
        }
    }

    function destroyContract() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
