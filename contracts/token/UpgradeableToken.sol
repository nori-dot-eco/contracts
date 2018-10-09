pragma solidity ^0.4.24;

import "./PausableToken.sol";
import "../registry/IContractRegistry.sol";
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";


contract UpgradeableToken is PausableToken, ERC820Implementer {

  event Initialized(
    string name,
    string symbol,
    uint256 granularity,
    uint256 totalSupply,
    address contractRegistryAddr,
    address owner
  );

  IContractRegistry public contractRegistry;
  bool private _initialized;

  constructor (
    string _name,
    string _symbol,
    uint256 _granularity,
    address[] _defaultOperators
  ) public PausableToken(_name, _symbol, _granularity, _defaultOperators) { }

  function initialize(
    string _name,
    string _symbol,
    uint256 _granularity,
    uint256 _totalSupply,
    address _contractRegistryAddr,
    address _owner
  ) public {
    require(!_initialized, "You can only initialize this contract once.");
    owner = _owner; //todo get this from registry
    mName = _name;
    mSymbol = _symbol;
    mTotalSupply = _totalSupply;
    mErc20compatible = true;
    require(_granularity >= 1, "Token granularity must be >= 1");
    mGranularity = _granularity;
    paused = false;

    contractRegistry = IContractRegistry(_contractRegistryAddr); //todo: get this from ENS or ERC820 somehow
    erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
    setInterfaceImplementation("ERC777Token", this);
    setInterfaceImplementation("ERC20Token", this);
    _initialized = true;
    emit Initialized(
      _name,
      _symbol,
      _granularity,
      _totalSupply,
      _contractRegistryAddr,
      _owner
    );
  }


  /**
    @notice Sets the contract registry address
  */
  function setContractRegistry(address _contractRegistryAddr) public onlyOwner {
    contractRegistry = IContractRegistry(_contractRegistryAddr);
  }

}