pragma solidity ^0.4.24;

import "./CommodityLib.sol";
import "./IMintableCommodity.sol";
import "../particpant/IParticipant.sol";
import "./BasicCommodity.sol";


contract MintableCommodity is BasicCommodity, IMintableCommodity {

  event Minted(address indexed to, uint commodityId, uint256 amount, address indexed operator, bytes operatorData);
  event InsufficientPermission(address sender, bytes operatorData, uint256 value, bytes misc); 

  //todo jaycen PRELAUNCH add onlyowner modifier or similar
  // todo jaycen, does the fact that this now returns data mess up compatibility with 721/777?
  /// @notice Generates `_value` tokens to be assigned to `_tokenHolder`
  /// @param _operatorData Data that will be passed to the recipient as a first transfer
  /// XXX: DO NOT SHIP TO PRODUCTION -- maybe we can get rid of ownermint if we allow any to creat crc category 0
  function mint(
    address _to, 
    bytes _operatorData, 
    uint256 _value, 
    bytes _misc
  ) public returns(uint64) {
    //todo jaycen is this safe? Can someone somehow return teh same participant address and spoof that the msg is coming from a defined address?
    address recipientImplementation = interfaceAddr(msg.sender, "IParticipant");
    if (recipientImplementation != 0) {
      //todo jaycen can we accomplish the same thing using 820? by defining IParticipantRegistry in the 820reg?
      require(IParticipant(recipientImplementation).getParticipantRegistry() == getParticipantRegistry());
    } else if (onlyParticipantCallers == true) {
      emit InsufficientPermission(
        msg.sender, 
        _operatorData, 
        _value, 
        _misc
      );
      revert();
    }

    /// Something to think about: what happens when multiple people
    /// mint at the same time and try to add to the commodity array
    /// what happens when the next person mining on a different chain
    /// tries to call this? Does the other person who tried to mint
    /// not actually get to mint as his chain is discarded?
    /// We need a way to notify if a CRC was minted or not after N
    /// blocks so that the minter knows to try and mint again
    CommodityLib.Commodity memory _commodity = CommodityLib.Commodity({
        category: uint64(1),
        timeRegistered: uint64(now),
        parentId: 0,
        value: uint256(_value),
        locked: false,
        misc: bytes(_misc)
    });
    uint newCRCId = commodities.push(_commodity) - 1;
    require(newCRCId <= 18446744073709551616);

    //TODO: make sure this is ok in production (maybe move to a diff func that invokes callrecipient internally)
    _transfer(0, _to, newCRCId);
    callRecipent(
      msg.sender, 
      0x0, 
      _to, 
      newCRCId, 
      "", 
      _operatorData, 
      false
    );

    emit Minted(
      _to, 
      newCRCId, 
      _value, 
      msg.sender, 
      _operatorData
    );
    return uint64(newCRCId);
  }

}
