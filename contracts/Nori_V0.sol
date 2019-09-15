pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Pausable.sol";

contract Nori_V0 is Initializable, ERC20Detailed, ERC20Mintable, ERC20Pausable {

  function initialize() public initializer {
    ERC20Detailed.initialize("Nori", "NORI", 18);
    ERC20Mintable.initialize(address(this));
    _removeMinter(address(this));
    ERC20Pausable.initialize(address(this));
    _removePauser(address(this));
    _addMinter(msg.sender);
    _addPauser(msg.sender);
  }
}
