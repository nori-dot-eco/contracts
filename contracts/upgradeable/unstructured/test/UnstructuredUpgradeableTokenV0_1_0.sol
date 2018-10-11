pragma solidity ^0.4.24;

import "../../../token/UpgradeableToken.sol";


/**
* @title UnstructuredUpgradeableTokenV0_1_0
* @dev Version 0 of a token to show upgradeability using unstructured storage.
*/
contract UnstructuredUpgradeableTokenV0_1_0 is UpgradeableToken { // solium-disable-line no-empty-blocks

  constructor(
    string _name,
    string _symbol,
    uint256 _granularity,
    address[] _defaultOperators
  ) public UpgradeableToken(_name, _symbol, _granularity, _defaultOperators) { owner = msg.sender; }

  /* -- Mint And Burn Functions (not part of the ERC777 standard, only the Events/tokensReceived call are) -- */
  //
  /// @notice Generates `_amount` tokens to be assigned to `_tokenHolder`
  ///  Sample mint function to showcase the use of the `Minted` event and the logic to notify the recipient.
  /// @param _tokenHolder The address that will be assigned the new tokens
  /// @param _amount The quantity of tokens generated
  /// @param _operatorData Data that will be passed to the recipient as a first transfer
  function mint(address _tokenHolder, uint256 _amount, bytes _operatorData) public onlyOwner {
    requireMultiple(_amount);
    mTotalSupply = mTotalSupply.add(_amount);
    mBalances[_tokenHolder] = mBalances[_tokenHolder].add(_amount);

    callRecipient(
      msg.sender,
      0x0,
      _tokenHolder,
      _amount,
      "",
      _operatorData,
      true
    );

    emit Minted(
      msg.sender,
      _tokenHolder,
      _amount,
      _operatorData);
    if (mErc20compatible) {
      emit Transfer(
        0x0,
        _tokenHolder,
        _amount);
    }
  }

  /// @notice Disables the ERC-20 interface. This function can only be called
  ///  by the owner.
  function disableERC20() public onlyOwner {
    mErc20compatible = false;
    setInterfaceImplementation("ERC20Token", 0x0);
  }

  /// @notice Re enables the ERC-20 interface. This function can only be called
  ///  by the owner.
  function enableERC20() public onlyOwner {
    mErc20compatible = true;
    setInterfaceImplementation("ERC20Token", this);
  }
}