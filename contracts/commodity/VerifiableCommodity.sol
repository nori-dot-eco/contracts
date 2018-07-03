pragma solidity ^0.4.24;

import "./BasicCommodity.sol";
import "./CommodityLib.sol";
import "./IVerifiableCommodity.sol";
import "../particpant/IParticipant.sol";


contract VerifiableCommodity is BasicCommodity, IVerifiableCommodity {

  event Verified(uint _commodityId, bytes _verifierData, uint64 _category);
  event InsufficientPermission(address sender, uint256 id, bytes data, uint64 category);
  
  // todo jaycen PRELAUNCH add onlyowner modifier or similar
  /// @notice Modifies `_category` (aka verification level) of a commodity
  function verify(uint256 _commodityId, bytes _verifierData, uint64 _category) public {
    //todo jaycen bounds check verification category <-- can probably be 0-100 + some misc others for flexibility
    //todo jaycen is this safe? Can someone somehow return teh same participant address and spoof that the msg is coming from a defined address?
    //todo jaycen should this be participant or verifier
    address recipientImplementation = interfaceAddr(msg.sender, "IParticipant");
    if (recipientImplementation != 0) {
      //todo jaycen can we accomplish the same thing using 820? by defining IParticipantRegistry in the 820reg?
      require(IParticipant(recipientImplementation).getParticipantRegistry() == getParticipantRegistry(), "Wrong participant registry");
    } else if (onlyParticipantCallers == true) {
      emit InsufficientPermission(
        msg.sender, 
        _commodityId, 
        _verifierData, 
        _category
      );
      revert("Insufficient permission");
    }
    commodities[_commodityId].category = _category;
    
    //todo jaycen notify supplier? call market to update token release paramaters? maybe needs a similar callOwner with eip820 callRecipient type style
    emit Verified(_commodityId, _verifierData, _category);
  }
}