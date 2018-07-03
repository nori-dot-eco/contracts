pragma solidity ^0.4.18;
import "./StandardTokenizedCommodityMarket.sol";
import "./../EIP777/IEIP777TokensOperator.sol";
import "./../commodity/ICommodityOperator.sol";


contract SelectableCrcMarketV0 is StandardTokenizedCommodityMarket, IEIP777TokensOperator, ICommodityOperator {

  constructor() StandardTokenizedCommodityMarket() public { }

  function buy(address _from, uint256 _tokenId, uint256 _amount) private {
    // _buy will throw if the bid or funds transfer fails todo jaycen fix static 0 addr
    _buy(_from, _tokenId, _amount);
    _transfer(_from, msg.sender, _tokenId, _amount);
    // todo jaycen disable the above two lines and enable the following. Functionality is ok, but it breaks tests
    // uint256 newSaleAmmount = _buy(_from, _tokenId, _amount);
    // if (newSaleAmmount != _amount) {
    //   _split(_tokenId, msg.sender, _amount);
    // } else {
    //   _transfer(_from, msg.sender, _tokenId, _amount);
    // }
  }

   /// @dev erc820 introspection : handler invoked when
   /// this contract is made an operator for a commodity
   function madeOperatorForCommodity(
    address operator,  // solhint-disable no-unused-vars
    address from,
    address to,
    uint tokenId,
    uint256 value,
    bytes userData,
    bytes operatorData
  )  // solhint-enable no-unused-vars
    public
  {
    if (preventCommodityOperator) {
      revert();
    }
    //todo jaycen can we figure out how to do this passing in a CommodityLib.Commodity struct (I was having solidity errors but it would be ideal)
    createSale(tokenId, 1, 1, from, 1000000000000000000, userData);
  }

  /// @dev erc820 introspection : handler invoked when this contract
  /// is made an operator for an erc777 token
  function madeOperatorForTokens(
    address operator,  // solhint-disable no-unused-vars
    address from,
    address to,
    uint256 amount,
    bytes userData,
    bytes operatorData
  )  // solhint-enable no-unused-vars
    public
  {
    if (preventTokenOperator) {
      revert();
    }
    //todo jaycen fix hardcodes (right now its only possiblee to buy a crc with ID 0 in selectable mode)
    buy(from, 0, amount);
  }

  function createSale(
    uint256 _tokenId,
    uint64 _category,
    uint32 _saleType,
    address _seller,
    uint256 _value,
    bytes _misc
  )
    public
  {
    _createSale(_tokenId, _category, _saleType, _seller, _value, _misc);
  }
}
