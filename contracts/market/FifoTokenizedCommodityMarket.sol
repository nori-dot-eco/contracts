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
    //todo add some logic that only allows the CRC contract to call this function
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

  function removeSale(uint256 _tokenId) public { //todo onlyThisContract modifier
    _removeSale(_tokenId);

    for (uint i = 0; i < commoditiesForSale.length; i++ ) {
      if (uint(commoditiesForSale[i]) == _tokenId) {
        commoditiesForSale[i] = -1;
        return;
      } 
    }
  }
}