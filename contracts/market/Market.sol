pragma solidity ^0.4.24;
import "./MarketLib.sol";
import "../EIP820/EIP820Implementer.sol";
import "../EIP820/IEIP820Implementer.sol";
import "../ownership/UnstructuredOwnable.sol";


contract Market is UnstructuredOwnable, EIP820Implementer, IEIP820Implementer {
  
  MarketLib.Market[] public marketItems;
  bool internal preventTokenReceived = true;
  bool internal preventTokenOperator = true;
  bool internal preventCommodityReceived = true;
  bool internal preventCommodityOperator = true;
  bool internal _initialized;
  
  constructor() public { }

  function initialize(address _eip820RegistryAddr, address[] _marketItems, address _owner) public {
    require(_initialized != true);
    for (uint i = 0;  i < _marketItems.length; i++) {
      _createMarketItem(_marketItems[i]);
    }
    setOwner(_owner);
    setIntrospectionRegistry(_eip820RegistryAddr);
    enableEIP777TokensOperator();
    enableCommodityOperator();
    _initialized = true;
  }
  
  function _createMarketItem (address _marketItem) internal {
    MarketLib.Market memory marketItem = MarketLib.Market({
        tokenContract: address(_marketItem)
    });
    marketItems.push(marketItem);
  }
  
  // solhint-disable-next-line no-unused-vars
  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
    return EIP820_ACCEPT_MAGIC;
  }
  
  function enableEIP777TokensOperator() public {
    preventTokenOperator = false;
    setInterfaceImplementation("IEIP777TokensOperator", this);
  }
  
  // TODO PRELAUNCH jaycen make only callable by Nori Market operator
  function enableCommodityOperator() public {
    preventCommodityOperator = false;
    setInterfaceImplementation("ICommodityOperator", this);
  }
}
