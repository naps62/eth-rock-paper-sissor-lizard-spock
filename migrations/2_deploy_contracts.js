var RockPaperSissors = artifacts.require("./RockPaperSissors.sol");

module.exports = function(deployer) {
  deployer.deploy(RockPaperSissors);
};
