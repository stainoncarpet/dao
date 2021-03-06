//SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DAOAssistant is Ownable {
    uint256 public finalizedProposalsCount;
    address public dao;

    event ProposalActionPerformed(string indexed);

    modifier onlyDao() {
        require(msg.sender == dao, "Only DAO can perform this action");
        _;
    }

    constructor(address _dao) {
        dao = _dao;
    }

    function performProposalAction(address chair) external onlyDao {
        finalizedProposalsCount = finalizedProposalsCount + 1;
        emit ProposalActionPerformed(
            string(
                abi.encodePacked(
                    "Proposals Count: ", 
                    finalizedProposalsCount,
                    "Chair Person: ",
                    chair
                )
            )
        );
    }

    function destroyContract() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}