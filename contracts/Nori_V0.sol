// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Pausable.sol";

//todo deprecate
contract Nori_V0 is Initializable, ERC20Detailed, ERC20Mintable, ERC20Pausable {
  event TransferWithFeeAndMemo(
    address indexed from,
    address indexed to,
    uint256 indexed value,
    address feeAddress,
    uint256 fee,
    bytes32 memo
  );

  function initialize() public initializer {
    ERC20Detailed.initialize("Nori", "NORI", 18);
    ERC20Mintable.initialize(address(this));
    _removeMinter(address(this));
    ERC20Pausable.initialize(address(this));
    _removePauser(address(this));
    _addMinter(msg.sender);
    _addPauser(msg.sender);
  }

  function transferWithFeeAndMemo(
    address _to,
    uint256 _amount,
    address _feeAddress,
    uint256 _fee,
    bytes32 _memo
  ) public whenNotPaused returns (bool) {
    super.transfer(_feeAddress, _fee);
    super.transfer(_to, _amount);
    emit TransferWithFeeAndMemo(
      msg.sender,
      _to,
      _amount,
      _feeAddress,
      _fee,
      _memo
    );
    return true;
  }
}
