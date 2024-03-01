// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Moneydrain {
    uint public counter;
    function getID() private returns(uint) { return ++counter; }

    struct Bet {
        address requester;
        address taker;
        address winner;
        uint value;
    }
    mapping( uint => Bet) public ledger;

    address payable public owner;
    constructor() payable {
        owner = payable(msg.sender);
    }

    function requestBet() public payable returns (uint) {
        Bet memory newBet = Bet(payable(msg.sender), payable(address(0)), payable(address(0)), msg.value);
        uint id = getID();
        ledger[id] = newBet;

        return id;
    }

    function takeBet(uint betID) public payable{
        require(betID <= counter, "Bet does not exist");
        Bet storage bet = ledger[betID];
        require(bet.value == msg.value, "You must match the bet value");

        bet.taker = payable(msg.sender);
        bet.winner = block.timestamp % 2 == 0 ? bet.requester : bet.taker;
    }   

    function withdrawBet(uint betID) public  {
        require(betID <= counter, "Bet does not exist");
        Bet storage bet = ledger[betID];
        require(bet.requester == msg.sender || bet.taker == msg.sender, "You are not part of this bet");
        require(bet.winner == msg.sender, "You didn't win this bet");

        uint cut = bet.value / 100;
        (bool success, ) = msg.sender.call{value: bet.value * 2 - cut}("");
        require(success, "Failed to withdraw Ether to winner");
        console.log('send %s to winner', bet.value * 2 - cut );

        (bool success2, ) = owner.call{value: cut}("");
        require(success2, "Failed to withdraw Ether to owner");
        console.log('send %s to owner', cut);
    }
}