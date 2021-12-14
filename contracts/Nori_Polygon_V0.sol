pragma solidity ^0.5.0;

import "./Nori_V0.sol";

contract Nori_Polygon_V0 is Nori_V0 {
  address public childChainManagerProxy;
  address deployer;

  function initialize(address _childChainManagerProxy) public initializer {
    super.initialize();
    childChainManagerProxy = _childChainManagerProxy;
    deployer = msg.sender;
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

  function updateChildChainManager(address newChildChainManagerProxy) external {
    require(newChildChainManagerProxy != address(0), "Bad ChildChainManagerProxy address");
    require(msg.sender == deployer, "You're not allowed");
    childChainManagerProxy = newChildChainManagerProxy;
  }

  function deposit(address user, bytes calldata depositData) external {
    require(msg.sender == childChainManagerProxy, "You're not allowed to deposit");
    uint256 amount = abi.decode(depositData, (uint256));
    super._mint(user, amount);
  }

  function withdraw(uint256 amount) external {
    super._burn(msg.sender, amount);
    emit Transfer(msg.sender, address(0), amount);
  }
}
