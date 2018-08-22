pragma solidity ^0.4.24;
import "./MarketLib.sol";
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";
import "../contrib/EIP/eip820/contracts/ERC820ImplementerInterface.sol";
import "../ownership/UnstructuredOwnable.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";
import "../registry/IContractRegistry.sol";

contract Market is UnstructuredOwnable, ERC820Implementer, ERC820ImplementerInterface {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  MarketLib.Market[] public marketItems;
  bool internal preventTokenReceived = true;
  bool internal preventTokenOperator = true;
  bool internal preventCommodityReceived = true;
  bool internal preventCommodityOperator = true;
  bool internal _initialized;

  IContractRegistry public contractRegistry;

  constructor() public { }

  function initialize(address _contractRegistryAddr, address[] _marketItems, address _owner) public {
    require(_initialized != true, "You can only initialize the contract once");
    for (uint i = 0;  i < _marketItems.length; i = i.add(1)) {
      _createMarketItem(_marketItems[i]);
    }
    setOwner(_owner);
    contractRegistry = IContractRegistry(_contractRegistryAddr); //todo: get this from ENS or ERC820 somehow
    erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
    enableEIP777TokensOperator();
    enableCommodityOperator();
    _initialized = true;
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

  function _createMarketItem (address _marketItem) internal {
    MarketLib.Market memory marketItem = MarketLib.Market({
        tokenContract: address(_marketItem)
    });
    marketItems.push(marketItem);
  }

  // solium-disable-next-line no-unused-vars
  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
    return ERC820_ACCEPT_MAGIC;
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
