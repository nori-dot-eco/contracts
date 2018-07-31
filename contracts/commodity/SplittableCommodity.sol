pragma solidity ^0.4.24;

import "./MintableCommodity.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";

contract SplittableCommodity is MintableCommodity {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  event Split(address indexed to, uint256 amount, uint64 parentId, address indexed operator, bytes operatorData);

  //todo jaycen implement a version where owner is splitting vs market is splitting
  //todo jaycen, maybe if we dont store data for misc in the new commodity and instead rely on front end to retrieve based on parentid to save gas
  function split(uint256 _tokenId, address _to, uint256 _amount) public {
    commodities[_tokenId].value =  commodities[_tokenId].value.sub(_amount);
    uint64 newCommodityIndex = mint(
      _to,
      "",
      _amount,
      ""
    );
    //todo jaycen check that this 64uint conversion is ok
    commodities[newCommodityIndex].misc = commodities[_tokenId].misc;
    //todo jaycen somehow move this into the mint/transfer scope so that locking happens only in one place
    commodities[newCommodityIndex].locked = true;

    emit Split(
      _to,
      _amount,
      newCommodityIndex,
      msg.sender,
      ""
    );
  }
}