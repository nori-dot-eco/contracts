pragma solidity ^0.4.24;
import "./StandardTokenizedCommodityMarket.sol";
import "./FifoQueue.sol";
import "./../EIP777/IEIP777TokensOperator.sol";
import "./../commodity/ICommodityOperator.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";


contract FifoTokenizedCommodityMarket is StandardTokenizedCommodityMarket, IEIP777TokensOperator, ICommodityOperator, FifoQueue {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  constructor() StandardTokenizedCommodityMarket() public { }

  function initialize(address _eip820RegistryAddr, address[] _marketItems, address _owner) public {
    require(_initialized != true);
    super.initialize(_eip820RegistryAddr, _marketItems, _owner);
    first = 1;
    last = 0;
  }


  function getEarliestSale() public returns (uint) {
    uint256 tokenId = peek();
    return tokenId;
  }

  function buy(address _buyer, uint256 _amount) private {
    uint256 tokenId = getEarliestSale();

    uint256 newSaleAmount = _buy(_buyer, tokenId, _amount);
    if (newSaleAmount != 0) {
      _split(tokenId, _buyer, _amount);
    } else {
      _transfer(
        _buyer,
        msg.sender,
        tokenId,
        _amount
      );
      remove(tokenId);
    }

  }

  /// @notice This function is called by the CRC contract when this contract
  /// is given authorization to send a particular commodity. When such happens,
  /// a sale for the CRC is created and added to the bottom of the FIFO queue
  /// @param tokenId the crc to remove from the FIFO sale queue
  /// @param from the owner of the crc, and the sale proceed recipient
  /// @param value the number of crcs in a bundle to list for sale
  /// @param userData data passed by the user
  /// @dev this function uses erc820 introspection : handler invoked when
  /// this contract is made an operator for a commodity
  function madeOperatorForCommodity(
    address, // operator,
    address from,
    address, // to,
    uint tokenId,
    uint256 value,
    bytes userData,
    bytes // operatorData
  ) public {
    require(address(commodityContract) == msg.sender);
    if (preventCommodityOperator) {
      revert();
    }
    //todo create the ability to list a new sale of a fractional value of the CRC by using the split function
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

  /// @notice This function is called by the CRC contract when this contract
  /// has lost authorization for a particular commodity. Since authorizations are
  /// what create the sale listings, is the market later loses authorization,
  /// then it needs to remove the sale from the queue (failure to do so would result in the
  /// market not being able to distribute CRCs to the buyer). Since there is also no way to
  /// Modify the queue, it is adamant that the CRC is removed from
  /// the queue or the result will be a broken market.
  /// @dev this function uses erc820 introspection : handler invoked when
  /// this contract is revoked an operator for a commodity
  /// @param tokenId the crc to remove from the FIFO sale queue
  function revokedOperatorForCommodity(
    address, // operator,
    address, // from,
    address, // to,
    uint tokenId,
    uint256, // value,
    bytes, // userData,
    bytes // operatorData
  ) public {
    require(address(commodityContract) == msg.sender);
    if (preventCommodityOperator) {
      revert();
    }
    //todo jaycen can we figure out how to do this passing in a CommodityLib.Commodity struct (I was having solidity errors but it would be ideal -- might be possible using eternal storage, passing hash of struct and then looking up struct values <-- would be VERY cool)
    removeSale(tokenId);
  }

  /// @dev erc820 introspection : handler invoked when this contract
  ///  is made an operator for an erc777 token
  function madeOperatorForTokens(
    address, // operator,
    address buyer,
    address, // to,
    uint256 amount,
    bytes, // userData,
    bytes // operatorData
  ) public {
    if (preventTokenOperator) {
      revert();
    }
    buy(buyer, amount);
  }

  //todo only allow from this address (cant make private due to operatorsend data)
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
    push(_tokenId);
  }

  function removeSale(uint256 _tokenId) private { //todo onlyThisContract modifier
    _removeSale(_tokenId);
    remove(_tokenId);
  }
}