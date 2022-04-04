// SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DAO is Ownable {
    address public chairPerson;
    address public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    mapping(address => uint256) public memberBalances;
    mapping(address => uint256[]) public memberCurrentParticipation;

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

        bool isWithdrawalAllowed = true;
        uint256[] storage proposalIds = memberCurrentParticipation[msg.sender];

        for (uint256 i = 0; i < proposalIds.length; i++) {
            if(proposals[proposalIds[i]].isFinished) { 
                proposalIds[i] = proposalIds[proposalIds.length - 1];
                proposalIds.pop();
            } else { isWithdrawalAllowed = false; }
        }

        require(isWithdrawalAllowed, "Can't withdraw while participating in ongoing proposals");

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
            isFinished: false
        });

        proposals.push(proposal);
        emit ProposalAdded(proposals.length - 1, description);
    }

    function vote(uint256 id, bool supportAgainst) external {
        require(!proposals[id].isFinished || block.timestamp <= proposals[id].startedAt + debatingPeriodDuration, "Voting is no longer possible");
        require(memberBalances[msg.sender] > 0, "Must own at least 1 token to vote");

        for (uint256 i = 0; i < memberCurrentParticipation[msg.sender].length; i++) {
            if(memberCurrentParticipation[msg.sender][i] == id){ revert("Already voted"); }
        }

        supportAgainst 
            ? proposals[id].votedForTotal += memberBalances[msg.sender] 
            : proposals[id].votedAgainstTotal += memberBalances[msg.sender]
        ;

        memberCurrentParticipation[msg.sender].push(id);
        emit Vote(id, supportAgainst, msg.sender);
    }

    function finishProposal(uint256 id) external {
        require(block.timestamp >= proposals[id].startedAt + debatingPeriodDuration, "Too early to finish");
        require(proposals[id].votedForTotal + proposals[id].votedAgainstTotal >= minimumQuorum, "Not enough tokens voted");

        uint256 votedForTotalPercentage = (proposals[id].votedForTotal * 100) / (proposals[id].votedAgainstTotal + proposals[id].votedForTotal);

        if(votedForTotalPercentage >= 51) { 
            proposals[id].recipient.call(proposals[id].callBytecode); 
            emit ProposalFinished(id, proposals[id].description, true);
        } else {
            emit ProposalFinished(id, proposals[id].description, false);
        }
        proposals[id].isFinished = true;
    }

    function destroyContract() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
