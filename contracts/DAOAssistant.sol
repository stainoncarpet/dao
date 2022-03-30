//SPDX-License-Identifier: MIT

pragma solidity >=0.8.11 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract DAOAssistant is Ownable {
    uint256 public finalizedProposalsCount;

    constructor() {}

    function performProposalAction() external returns(bool){
        finalizedProposalsCount++;
        return true;
    }

    function destroyContract() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}