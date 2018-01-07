const RockPaperSissors = artifacts.require("./RockPaperSissors.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');
const sha3 = require('solidity-sha3').default;
const P = require("bluebird");

const getBalance = P.promisify(web3.eth.getBalance);
const sendTransaction = P.promisify(web3.eth.sendTransaction);

const currentBlock = () => web3.eth.blockNumber;

contract("RockPaperSissors", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];
  const carol = accounts[3];
  const aliceSalt = "alice";
  const bobSalt = "bob";
  const fee = web3.toWei(0.1, "ether");
  let contract = null;

  const Move = {
    Rock: 0,
    Paper: 1,
    Sissor: 2
  };

  const encryptedMove = async (m, salt) => await contract.getHash(m, salt);

  beforeEach(async () => {
    contract = await RockPaperSissors.new({ from: owner });
  });

  it("allows two players to enroll", async () => {
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
  });

  it("does not allow playing with an incorrect entrance fee", async () => {
    try {
      await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: 0 });
    } catch(err) {
      assertRevert(err);
    }
  });

  it("does not allow 3 players to enroll", async () => {
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });

    try {
      await contract.play(await encryptedMove(Move.Paper, ""), { from: carol, value: fee });
    } catch(err) {
      assertRevert(err);
    }
  });

  it("allows players to reveal their move", async () => {
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });


    await contract.reveal(Move.Rock, aliceSalt, { from: alice });
    await contract.reveal(Move.Paper, bobSalt, { from: bob });

    const aliceMove = await contract.players(0);
    const bobMove = await contract.players(1);

    assert(aliceMove[2].equals(Move.Rock));
    assert(bobMove[2].equals(Move.Paper));
  });

  it("does not allow non-players to reveal their move", async () => {
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });

    try {
      await contract.reveal(Move.Rock, aliceSalt, { from: carol });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("does not allow revealing the move before both players have played", async () => {
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });

    try {
      await contract.reveal(Move.Rock, aliceSalt, { from: alice });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it.only("selects the correct winner in a rock vs paper game", async () => {
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });

    await contract.reveal(Move.Rock, aliceSalt, { from: alice });
    await contract.reveal(Move.Paper, bobSalt, { from: bob });

    assert.equal(await contract.Winner(), bob);
  });

  it.only("selects the correct winner in a paper vs rock game", async () => {
    // reverse order than the one above
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await contract.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });

    await contract.reveal(Move.Paper, bobSalt, { from: bob });
    await contract.reveal(Move.Rock, aliceSalt, { from: alice });

    assert.equal(await contract.Winner(), bob);
  });

  it("can find draws", async () => {
    await contract.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await contract.play(await encryptedMove(Move.Paper, aliceSalt), { from: alice, value: fee });

    await contract.reveal(Move.Paper, bobSalt, { from: bob });
    await contract.reveal(Move.Paper, aliceSalt, { from: alice });

    assert.equal(await contract.Winner(), 0);
  });
});