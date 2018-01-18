const RockPaperSissors = artifacts.require("./RockPaperSissors.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');
const mineTx = require("./helpers/mineTx");
const sha3 = require('solidity-sha3').default;
const P = require("bluebird");

const getBalance = P.promisify(web3.eth.getBalance);
const sendTransaction = P.promisify(web3.eth.sendTransaction);

const currentBlock = () => web3.eth.blockNumber;
console.log('here')

contract("RockPaperSissors", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];
  const carol = accounts[3];
  const aliceSalt = "alice";
  const bobSalt = "bob";
  const fee = web3.toWei(0.1, "ether");
  let game = null;
  let tx = null;

  const Move = {
    Rock: 0,
    Paper: 1,
    Sissor: 2,
    Lizard: 3,
    Spock: 4
  };

  const encryptedMove = async (m, salt) => tx = game.getHash(m, salt);

  beforeEach("deploy RockPaperSissors", async () => {
    game = await RockPaperSissors.new({ from: owner });
  });

  it("allows two players to enroll", async () => {
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
  });

  it("does not allow playing with an incorrect entrance fee", async () => {
    try {
      tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: 0 });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("does not allow 3 players to enroll", async () => {
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);

    try {
      tx = game.play(await encryptedMove(Move.Paper, ""), { from: carol, value: fee });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("allows players to reveal their move", async () => {
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);


    tx = game.reveal(Move.Rock, aliceSalt, { from: alice });
    await mineTx(tx);
    tx = game.reveal(Move.Paper, bobSalt, { from: bob });
    await mineTx(tx);

    const aliceMove = await game.players(0);
    const bobMove = await game.players(1);

    assert(aliceMove[2].equals(Move.Rock));
    assert(bobMove[2].equals(Move.Paper));
  });

  it("does not allow non-players to reveal their move", async () => {
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);

    try {
      tx = game.reveal(Move.Rock, aliceSalt, { from: carol });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("does not allow revealing the move before both players have played", async () => {
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);

    try {
      tx = game.reveal(Move.Rock, aliceSalt, { from: alice });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("selects the correct winner in a rock vs paper game", async () => {
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);

    tx = game.reveal(Move.Rock, aliceSalt, { from: alice });
    await mineTx(tx);
    tx = game.reveal(Move.Paper, bobSalt, { from: bob });
    await mineTx(tx);

    assert.equal(await game.getWinner(), bob);
  });

  it("selects the correct winner in a paper vs rock game", async () => {
    // reverse order than the one above
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Rock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);

    tx = game.reveal(Move.Paper, bobSalt, { from: bob });
    await mineTx(tx);
    tx = game.reveal(Move.Rock, aliceSalt, { from: alice });
    await mineTx(tx);

    assert.equal(await game.getWinner(), bob);
  });

  it("knows that paper disproves spock", async () => {
    // reverse order than the one above
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Spock, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);

    tx = game.reveal(Move.Paper, bobSalt, { from: bob });
    await mineTx(tx);
    tx = game.reveal(Move.Spock, aliceSalt, { from: alice });
    await mineTx(tx);

    assert.equal(await game.getWinner(), bob);
  });

  it("can find draws", async () => {
    tx = game.play(await encryptedMove(Move.Paper, bobSalt), { from: bob, value: fee });
    await mineTx(tx);
    tx = game.play(await encryptedMove(Move.Paper, aliceSalt), { from: alice, value: fee });
    await mineTx(tx);

    tx = game.reveal(Move.Paper, bobSalt, { from: bob });
    await mineTx(tx);
    tx = game.reveal(Move.Paper, aliceSalt, { from: alice });
    await mineTx(tx);

    assert.equal(await game.getWinner(), 0);
  });
});
