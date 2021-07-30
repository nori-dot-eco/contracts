pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Pausable.sol";

contract Nori_V0 is Initializable, ERC20Detailed, ERC20Mintable, ERC20Pausable {
  event TransferWithFee(address indexed from, address indexed to, uint256 indexed value, address feeAddress, uint256 fee);

  function initialize() public initializer {
    ERC20Detailed.initialize("Nori", "NORI", 18);
    ERC20Mintable.initialize(address(this));
    _removeMinter(address(this));
    ERC20Pausable.initialize(address(this));
    _removePauser(address(this));
    _addMinter(msg.sender);
    _addPauser(msg.sender);
  }

  function transferWithFee(
    address _to,
    uint256 _amount,
    address _feeAddress,
    uint256 _fee
  ) public whenNotPaused returns (bool) {
    super.transfer(_feeAddress, _fee);
    super.transfer(_to, _amount);
    emit TransferWithFee(
      msg.sender,
      _to,
      _amount,
      _feeAddress,
      _fee
    );
    return true;
  }
}
