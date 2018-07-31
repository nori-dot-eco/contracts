pragma solidity ^0.4.24;
import "./StandardTokenizedCommodityMarket.sol";
import "./../EIP777/IEIP777TokensOperator.sol";
import "./../commodity/ICommodityOperator.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";


contract FifoTokenizedCommodityMarket is StandardTokenizedCommodityMarket, IEIP777TokensOperator, ICommodityOperator {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  int[] public commoditiesForSale;

  constructor() StandardTokenizedCommodityMarket() public { }

  function initialize(address _eip820RegistryAddr, address[] _marketItems, address _owner) public {
    require(_initialized != true);
    super.initialize(_eip820RegistryAddr, _marketItems, _owner);
  }


  function getEarliestSale() public view returns (uint, uint) {
    if (commoditiesForSale.length >= 0) {
      for (uint256 i = 0; i < commoditiesForSale.length; i = i.add(1) ) {
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

    uint256 newSaleAmount = _buy(_from, commodityIndex, _amount);
    if (newSaleAmount != 0) {
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
    address from,
    address, // to,
    uint256 tokenId,
    uint256 value,
    bytes userData,
    bytes // operatorData
  ) public {
    if (preventCommodityOperator) {
      revert();
    }
    //todo jaycen can we figure out how to do this passing in a CommodityLib.Commodity struct (I was having solidity errors but it would be ideal -- might be possible using eternal storage, passing hash of struct and then looking up struct values <-- would be VERY cool)
    createSale(
      tokenId,
      1,
      2,
      from,
      value,
      userData
    );
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

  function createSale(
    uint256 _tokenId,
    uint64 _category,
    uint32 _saleType,
    address _seller,
    uint256 _value,
    bytes _misc
  ) private {
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
}