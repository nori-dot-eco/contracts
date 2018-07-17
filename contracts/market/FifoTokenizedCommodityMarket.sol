pragma solidity ^0.4.24;
import "./StandardTokenizedCommodityMarket.sol";
import "./../EIP777/IEIP777TokensOperator.sol";
import "./../commodity/ICommodityOperator.sol";


contract FifoTokenizedCommodityMarket is StandardTokenizedCommodityMarket, IEIP777TokensOperator, ICommodityOperator {
  int[] public commoditiesForSale;

  constructor() StandardTokenizedCommodityMarket() public { }

  function initialize(address _eip820RegistryAddr, address[] _marketItems, address _owner) public {
    require(_initialized != true);
    super.initialize(_eip820RegistryAddr, _marketItems, _owner);
  }


  function getEarliestSale() public view returns (uint, uint) {   
    if (commoditiesForSale.length >= 0) {    
      for (uint i = 0; i < commoditiesForSale.length; i++ ) {
        if (commoditiesForSale[i] >= 0) {
          return (uint(commoditiesForSale[i]), i);
        } 
      }
    }
    else 
      revert();
  }

  function buy(address _from, uint256 _amount) private {
    var (commodityIndex, saleIndex) = getEarliestSale();

    uint256 newSaleAmmount = _buy(_from, commodityIndex, _amount);
    if (newSaleAmmount != 0) {
      _split(commodityIndex, _from, _amount);
    } else {
      _transfer(
        _from, 
        msg.sender, 
        commodityIndex, 
        _amount
      );
      commoditiesForSale[saleIndex] = -1;
    }
      
  } 

  /// @dev erc820 introspection : handler invoked when 
  /// this contract is made an operator for a commodity
  function madeOperatorForCommodity(
    address, // operator,  
    address, // from,
    address, // to,
    uint, // tokenId,
    uint256, // value,
    bytes, // userData,
    bytes operatorData
  ) public {
    if (preventCommodityOperator) {
      revert();
    }
    require(_executeCall(address(this), 0, operatorData));
  }
  function _executeCall(address to, uint256 value, bytes data) private returns (bool success) {
    assembly { // solium-disable-line security/no-inline-assembly
      success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
    }
  }

  /// @dev erc820 introspection : handler invoked when this contract
  ///  is made an operator for an erc777 token
  function madeOperatorForTokens(
    address, // operator,  
    address from,
    address, // to,
    uint256 amount,
    bytes, // userData,
    bytes // operatorData
  ) public {
    if (preventTokenOperator) { 
      revert();
    }
    buy(from, amount);
  }
  //todo only allow from this address (cant make private due to operatorsend data)
  function createSale(
    uint256 _tokenId,
    uint64 _category,
    uint32 _saleType,
    address _seller,
    uint256 _value,
    bytes _misc
  ) public {
    _createSale(
      _tokenId, 
      _category, 
      _saleType, 
      _seller, 
      _value, 
      _misc
    );
    commoditiesForSale.push(int(_tokenId));
  }

  function removeSale(
    uint256 _tokenId
  ) public {
    _removeSale(
      _tokenId
    );
    for (uint i = 0; i < commoditiesForSale.length; i++ ) {
      if (uint(commoditiesForSale[i]) == _tokenId) {
        commoditiesForSale[i] = -1;
        return;
      } 
    }
  }
}