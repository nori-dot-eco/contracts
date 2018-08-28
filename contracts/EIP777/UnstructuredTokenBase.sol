pragma solidity ^0.4.24;

import "../EIP777/IEIP777.sol";
import "../EIP777/IEIP777TokensRecipient.sol";
import "../EIP777/IEIP777TokensSender.sol";
import "../EIP777/IEIP777TokensOperator.sol";
import "../EIP20/Ierc20.sol";
import "../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";
import "../registry/IContractRegistry.sol";

/**
* @title UnstructuredTokenBase
* @dev
*   This is an ERC777/20 compatible token base with upgradable properties
*   that use a proxy/dispatch (DELEGATECALL) variation that allows for
*   storage changes over time. IE, you can define new vars in new versions
*/
contract UnstructuredTokenBase is Ownable, Ierc20, IEIP777, ERC820Implementer {

  using SafeMath for uint256;

  event Initialized(address owner);
  string private mName;
  string private mSymbol;
  uint256 private mGranularity;
  uint256 private mTotalSupply;
  bool private _initialized;

  bool private mErc20compatible;

  mapping(address => uint) private mBalances;
  mapping(address => mapping(address => bool)) private mAuthorized;
  mapping(address => mapping(address => uint256)) private mAllowed;
  IContractRegistry public contractRegistry;

  ///  @notice This modifier is applied to erc20 obsolete methods that are
  ///  implemented only to maintain backwards compatibility. When the erc20
  ///  compatibility is disabled, this methods will fail.
  modifier erc20 () {
    require(mErc20compatible, "The ERC-20 interface is not currently enabled");
    _;
  }


  constructor () public { }

  function initialize(
    string _name,
    string _symbol,
    uint256 _granularity,
    uint256 _totalSupply,
    address _contractRegistryAddr,
    address _owner
  ) public {
    require(!_initialized, "You can only initialize this contract once.");
    mName = _name;
    mSymbol = _symbol;
    mTotalSupply = _totalSupply;
    mErc20compatible = true;
    require(_granularity >= 1, "Token granularity must be >= 1");
    mGranularity = _granularity;

    owner = _owner;

    contractRegistry = IContractRegistry(_contractRegistryAddr); //todo: get this from ENS or ERC820 somehow
    erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
    setInterfaceImplementation("IEIP777", this);
    setInterfaceImplementation("Ierc20", this);
    _initialized = true;
    emit Initialized(_owner); //todo fix this
  }

  /**
    @notice Sets the contract registry address
  */
  function setContractRegistry(address _contractRegistryAddr) public onlyOwner {
    contractRegistry = IContractRegistry(_contractRegistryAddr);
  }

  /**
    @dev returns the current initialization status
  */
  function initialized() public view returns(bool) {
    return _initialized;
  }

  /// @return the name of the token
  function name() public view returns (string) { return mName; }

  /// @return the symbol of the token
  function symbol() public view returns(string) { return mSymbol; }

  /// @return the granularity of the token
  function granularity() public view returns(uint256) { return mGranularity; }

  /// @return the total supply of the token
  function totalSupply() public view returns(uint256) { return mTotalSupply; }

  /// @notice For Backwards compatibility
  /// @return The decimls of the token. Forced to 18 in ERC777.
  function decimals() public erc20 view returns (uint8) { return uint8(18); }

  /// @notice Return the account balance of some account
  /// @param _tokenHolder Address for which the balance is returned
  /// @return the balance of `_tokenAddress`.
  function balanceOf(address _tokenHolder) public view returns (uint256) {
    return mBalances[_tokenHolder];
  }

  /// @notice Disables the ERC-20 interface. This function can only be called
  ///  by the owner.
  function disableERC20() public onlyOwner {
    mErc20compatible = false;
    setInterfaceImplementation("Ierc20", 0x0);
  }

  /// @notice Re enables the ERC-20 interface. This function can only be called
  ///  by the owner.
  function enableERC20() public onlyOwner {
    mErc20compatible = true;
    setInterfaceImplementation("Ierc20", this);
  }

  /// @notice ERC20 backwards compatible transfer.
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be transferred
  /// @return `true`, if the transfer can't be done, it should fail.
  function transfer(address _to, uint256 _value) public erc20 returns (bool success) {
    doSend(
      msg.sender,
      _to,
      _value,
      "",
      msg.sender,
      "",
      false
    );
    return true;
  }

  /// @notice ERC20 backwards compatible transferFrom.
  /// @param _from The address holding the tokens being transferred
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be transferred
  /// @return `true`, if the transfer can't be done, it should fail.
  function transferFrom(address _from, address _to, uint256 _value) public erc20 returns (bool success) {
    require(
      _value <= mAllowed[_from][msg.sender],
      "You can only use 'transferFrom' when sending a value that is <= your current allowance"
    );

    // Cannot be after doSend because of tokensReceived re-entry
    mAllowed[_from][msg.sender] = mAllowed[_from][msg.sender].sub(_value);
    doSend(
      _from,
      _to,
      _value,
      "",
      msg.sender,
      "",
      false
    );
    return true;
  }

  /// @notice ERC20 backwards compatible approve.
  ///  `msg.sender` approves `_spender` to spend `_value` tokens on its behalf.
  /// @param _spender The address of the account able to transfer the tokens
  /// @param _value The amount of tokens to be approved for transfer
  /// @return `true`, if the approve can't be done, it should fail.
  function approve(address _spender, uint256 _value) public erc20 returns (bool success) {
    mAllowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  /// @notice ERC20 backwards compatible allowance.
  ///  This function makes it easy to read the `allowed[]` map
  /// @param _owner The address of the account that owns the token
  /// @param _spender The address of the account able to transfer the tokens
  /// @return Amount of remaining tokens of _owner that _spender is allowed
  ///  to spend
  function allowance(address _owner, address _spender) public erc20 view returns (uint256 remaining) {
    return mAllowed[_owner][_spender];
  }

  /// @notice Send `_value` amount of tokens to address `_to`
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  function send(address _to, uint256 _value) public {
    doSend(
      msg.sender,
      _to,
      _value,
      "",
      msg.sender,
      "",
      true
    );
  }

  //todo jaycen are both send funcs needed for some backwards compat reason? check latest 777 draft
  /// @notice Send `_value` amount of tokens to address `_to` passing `_userData` to the recipient
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  function send(address _to, uint256 _value, bytes _userData) public {
    doSend(
      msg.sender,
      _to,
      _value,
      _userData,
      msg.sender,
      "",
      true
    );
  }

  /// @notice Authorize a third party `_operator` to manage (send) `msg.sender`'s tokens.
  /// @param _operator The operator that wants to be Authorized
  //todo jaycen pretty sure overloads dont work so calling the following is impossible
  function authorizeOperator(address _operator) public {
    require(_operator != msg.sender, "You cannot designate yourself as an operator");
    mAuthorized[_operator][msg.sender] = true;
    emit AuthorizedOperator(_operator, msg.sender);
  }
  /// @notice Authorize a third party `_operator` to manage [only some] (send) `msg.sender`'s tokens.
  /// @param _operator The operator that wants to be Authorized
  function authorizeOperator(address _operator, uint256 _value) public {
    require(_operator != msg.sender, "You cannot designate yourself as an operator");
    //todo jaycen only authorize an allowance
    mAllowed[msg.sender][_operator] = _value;
    //todo jaycen is the following needed, It is not in the spec
    mAuthorized[_operator][msg.sender] = true;
    callOperator(
      _operator,
      msg.sender,
      _operator,
      _value,
      "0x0",
      "0x0",
      false
    );
    emit AuthorizedOperator(_operator, msg.sender);
  }

  /// @notice Revoke a third party `_operator`'s rights to manage (send) `msg.sender`'s tokens.
  /// @param _operator The operator that wants to be Revoked
  function revokeOperator(address _operator) public {
    //todo jaycen IMPORTANT PRELAUNCH implement a revoke operation caller that can cancel market sales
    require(_operator != msg.sender, "You cannot revoke yourself as an operator");
    //todo do I need to set mAllowed to 0? this is not in the spec due to them decluding allowance
    mAllowed[msg.sender][_operator] = 0;
    mAuthorized[_operator][msg.sender] = false;
    emit RevokedOperator(_operator, msg.sender);
  }

  /// @notice Check whether the `_operator` address is allowed to manage the tokens held by `_tokenHolder` address.
  /// @param _operator address to check if it has the right to manage the tokens
  /// @param _tokenHolder address which holds the tokens to be managed
  /// @return `true` if `_operator` is authorized for `_tokenHolder`
  function isOperatorFor(address _operator, address _tokenHolder) public view returns (bool) {
    return _operator == _tokenHolder || mAuthorized[_operator][_tokenHolder];
  }

  /// @notice Send `_value` amount of tokens on behalf of the address `from` to the address `to`.
  /// @param _from The address holding the tokens being sent
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  /// @param _userData Data generated by the user to be sent to the recipient
  /// @param _operatorData Data generated by the operator to be sent to the recipient
  function operatorSend(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes _userData,
    bytes _operatorData
  ) public {
    //todo jaycen for somereason the following two lines werent included in the 777
    // the spec seems to not like wanting to spend allowances, look into why
    require(_value <= mAllowed[_from][msg.sender], "An operator can only send a value that is <= their current allowance");
    mAllowed[_from][msg.sender] = mAllowed[_from][msg.sender].sub(_value);
    require(
      isOperatorFor(_operator, _from),
      "Only an operator can send on behalf of the token owner"
    ); // todo, decide if we really want both isOperatorFor AND mAllowed allowances
    doSend(
      _from,
      _to,
      _value,
      _userData,
      msg.sender,
      _operatorData,
      false
    );
  }

  /// @notice Send `_value` amount of tokens on behalf of the address `from` to the address `to`.
  /// @param _from The address holding the tokens being sent
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  /// @param _userData Data generated by the user to be sent to the recipient
  /// @param _operatorData Data generated by the operator to be sent to the recipient
  function operatorSend(
    address _from,
    address _to,
    uint256 _value,
    bytes _userData,
    bytes _operatorData
  ) public {
    // for backwards compatibility (only should be called when callOperator NOT being used)
    operatorSend(
      msg.sender,
      _from,
      _to,
      _value,
      _userData,
      _operatorData
    );
  }

  /// @notice Burns `_value` tokens from `_tokenHolder`
  ///  Sample burn function to showcase the use of the `Burnt` event.
  /// @param _tokenHolder The address that will lose the tokens
  /// @param _value The quantity of tokens to burn
  function burn(address _tokenHolder, uint256 _value) public onlyOwner {
    requireMultiple(_value);
    require(balanceOf(_tokenHolder) >= _value, "You can only burn a value that is >= the tokenHolders balance");

    mBalances[_tokenHolder] = mBalances[_tokenHolder].sub(_value);
    mTotalSupply = mTotalSupply.sub(_value);

    emit Burnt(_tokenHolder, _value);
    if (mErc20compatible) {
      emit Transfer(_tokenHolder, 0x0, _value);
    }
  }

  /// @notice Generates `_value` tokens to be assigned to `_tokenHolder`
  /// @param _tokenHolder The address that will be assigned the new tokens
  /// @param _value The quantity of tokens generated
  /// @param _operatorData Data that will be passed to the recipient as a first transfer
  /// XXX: DO NOT SHIP TO PRODUCTION (use following instead :  function ownerMint(address _tokenHolder, uint256 _value, bytes _operatorData) public onlyOwner
  function mint(address _tokenHolder, uint256 _value, bytes _operatorData) public {
    requireMultiple(_value);
    mTotalSupply = mTotalSupply.add(_value);
    mBalances[_tokenHolder] = mBalances[_tokenHolder].add(_value);

    callRecipient(
      msg.sender,
      0x0,
      _tokenHolder,
      _value,
      "",
      _operatorData,
      true
    );

    emit Minted(
      _tokenHolder,
      _value,
      msg.sender,
      _operatorData
    );
    if (mErc20compatible) {
      emit Transfer(0x0, _tokenHolder, _value);
    }
  }

  /// @notice Internal function that ensures `_value` is multiple of the granularity
  /// @param _value The quantity that want's to be checked
  function requireMultiple(uint256 _value) internal view {
    require(
      _value > 0 && _value.div(mGranularity).mul(mGranularity) == _value,
      "You can only send tokens that are in a valid granularity range"
    );
  }

  /// @notice Check whether an address is a regular address or not.
  /// @param _addr Address of the contract that has to be checked
  /// @return `true` if `_addr` is a regular address (not a contract)
  function isRegularAddress(address _addr) internal view returns (bool) {
    if (_addr == 0) {
      return false;
    }
    uint size;
    assembly { size := extcodesize(_addr) } // solium-disable-line security/no-inline-assembly
    return size == 0;
  }

  /// @notice Helper function actually performing the sending of tokens.
  /// @param _from The address holding the tokens being sent
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  /// @param _userData Data generated by the user to be passed to the recipient
  /// @param _operatorData Data generated by the operator to be passed to the recipient
  /// @param _preventLocking `true` if you want this function to throw when tokens are sent to a contract not
  ///  implementing `IEIP777TokensRecipient` or not white-listed in `tokenableContractsRegistry`.
  ///  ERC777 native Send functions MUST set this parameter to `true`, and backwards compatible ERC20 transfer
  ///  functions SHOULD set this parameter to `false`.
  function doSend(
    address _from,
    address _to,
    uint256 _value,
    bytes _userData,
    address _operator,
    bytes _operatorData,
    bool _preventLocking
  ) private {
    requireMultiple(_value);
    require(_to != address(0), "You cannot send tokens to the burn address (0x0)");          // forbid sending to 0x0 (=burning)
    require(mBalances[_from] >= _value, "You can only send a value >= your current token balance"); // ensure enough funds

    mBalances[_from] = mBalances[_from].sub(_value);
    mBalances[_to] = mBalances[_to].add(_value);

    callRecipient(
      _operator,
      _from,
      _to,
      _value,
      _userData,
      _operatorData,
      _preventLocking
    );

    emit Sent(
      _from,
      _to,
      _value,
      _userData,
      _operator,
      _operatorData
    );
    if (mErc20compatible) {
      emit Transfer(_from, _to, _value);
    }
  }

  /// @notice Helper function that checks for IEIP777TokensRecipient on the recipient and calls it.
  ///  May throw according to `_preventLocking`
  /// @param _operator The address authorized to send tokens
  /// @param _from The address holding the tokens being sent
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  /// @param _userData Data generated by the user to be passed to the recipient
  /// @param _operatorData Data generated by the operator to be passed to the recipient
  /// @param _preventLocking `true` if you want this function to throw when tokens are sent to a contract not
  ///  implementing `IEIP777TokensRecipient` or not whitelisted in `tokenableContractsRegistry`.
  ///  ERC777 native Send functions MUST set this parameter to `true`, and backwards compatible ERC20 transfer
  ///  functions SHOULD set this parameter to `false`.
  function callRecipient(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes _userData,
    bytes _operatorData,
    bool _preventLocking
  ) private {
    address recipientImplementation = interfaceAddr(_to, "IEIP777TokensRecipient");
    if (recipientImplementation != 0) {
      IEIP777TokensRecipient(recipientImplementation).tokensReceived(
        _operator,
        _from,
        _to,
        _value,
        _userData,
        _operatorData
      );
    } else if (_preventLocking) {
      require(isRegularAddress(_to), "The recipient contract does not support this token");
    }
  }

  /// @notice Helper function that checks for IEIP777TokensOperator on the recipient and calls it.
  ///  May throw according to `_preventLocking`
  /// @param _from The address holding the tokens being sent
  /// @param _to The address of the recipient
  /// @param _value The amount of tokens to be sent
  /// @param _userData Data generated by the user to be passed to the recipient
  /// @param _operatorData Data generated by the operator to be passed to the recipient
  /// @param _preventLocking `true` if you want this function to throw when tokens are sent to a contract not
  ///  implementing `IEIP777TokensOperator`
  ///  ERC777 native Send functions MUST set this parameter to `true`, and backwards compatible ERC20 transfer
  ///  functions SHOULD set this parameter to `false`.
  function callOperator(
    address _operator,
    address _from,
    address _to,
    uint256 _value,
    bytes _userData,
    bytes _operatorData,
    bool _preventLocking
  ) private {
    address recipientImplementation = interfaceAddr(_to, "IEIP777TokensOperator");
    if (recipientImplementation != 0) {
      IEIP777TokensOperator(recipientImplementation).madeOperatorForTokens(
        _operator,
        _from,
        _to,
        _value,
        _userData,
        _operatorData
      );
    } else if (_preventLocking) {
      require(isRegularAddress(_to), "The recipient contract does not support this token.");
    }
  }
}