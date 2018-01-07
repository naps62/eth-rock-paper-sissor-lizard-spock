pragma solidity ^0.4.17;

import "./strings.sol";

contract RockPaperSissors {
  using strings for *;

  uint public constant ENTRANCE_FEE = 0.1 ether;

  enum Move {
    Rock,
    Paper,
    Sissor
  }

  mapping(bytes32 => bool) public winningPairs;

  struct Player {
    address account;
    bytes32 encryptedMove;
    Move move;
    bool revealed;
  }

  Player[] public players;

  function RockPaperSissors() {
    winningPairs[keccak256(Move.Paper, Move.Rock)] = true;
    winningPairs[keccak256(Move.Rock, Move.Sissor)] = true;
    winningPairs[keccak256(Move.Sissor, Move.Paper)] = true;
  }

  function play(bytes32 encryptedMove)
  public
  payable
  returns (bool success)
  {
    require(msg.value == ENTRANCE_FEE);
    require(players.length < 2);

    Player memory player;
    player.account = msg.sender;
    player.encryptedMove = encryptedMove;

    players.push(player);

    return true;
  }

  function reveal(Move move, string salt)
  public
  returns (bool success)
  {
    require(players.length == 2);
    uint playerIndex = findPlayerIndex(msg.sender);
    require(playerIndex >= 0 && playerIndex < 2);
    bytes32 hash = getHash(move, salt);

    require(players[playerIndex].encryptedMove == hash);

    players[playerIndex].move = move;
    players[playerIndex].revealed = true;

    return true;
  }

  function getWinner()
  public
  view
  ensureRevealed
  returns (address winningAccount)
  {
    if (players[0].move == players[1].move) {
      return address(0);
    }

    bytes32 hash = keccak256(players[0].move, players[1].move);

    if (winningPairs[hash]) {
      return players[0].account;
    } else {
      return players[1].account;
    }
  }

  function getPrize()
  public
  returns (bool success)
  {
    uint playerIndex = findPlayerIndex(msg.sender);
    require(playerIndex >= 0 && playerIndex < 0);

    address winner = getWinner();

    if (winner == msg.sender) {
      msg.sender.transfer(ENTRANCE_FEE * 2);
    } else if (winner == address(0)) {
      msg.sender.transfer(ENTRANCE_FEE);
    }

    returns true;
  }


  function findPlayerIndex(address account)
  public
  view
  returns (uint index)
  {
    if (players[0].account == account) {
      return 0;
    } else if (players[1].account == account) {
      return 1;
    } else {
      return 2;
    }
  }

  function getHash(Move move, string salt)
  public
  pure
  returns (bytes32)
  {
    return keccak256(uint(move), salt);
  }

  modifier ensureRevealed {
    require(players[0].revealed);
    require(players[1].revealed);
    _;
  }
}
