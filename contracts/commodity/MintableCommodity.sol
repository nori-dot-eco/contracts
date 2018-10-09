pragma solidity ^0.4.24;

import "./CommodityLib.sol";
import "./IMintableCommodity.sol";
import "../participant/IParticipant.sol";
import "./BasicCommodity.sol";
import "openzeppelin-solidity/contracts//math/SafeMath.sol";


contract MintableCommodity is BasicCommodity, IMintableCommodity {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  event Minted(address indexed to, uint commodityId, uint256 amount, address indexed operator, bytes operatorData);
  event InsufficientPermission(address sender, bytes operatorData, uint256 value, bytes misc);

  // todo jaycen, does the fact that this now returns data mess up compatibility with 721/777?
  /// @notice Generates `_value` tokens to be assigned to `_tokenHolder`
  /// @param _operatorData Data that will be passed to the recipient as a first transfer
  function mint(
    address _to,
    bytes _operatorData,
    uint256 _value,
    bytes _misc
  ) public whenNotPaused returns(uint64) {

    //todo replace the following if else logic with the require logic that exists in the split function. This is needed only so that current tests don't break
    address participantProxy = interfaceAddr(msg.sender, "IParticipant");
    if (participantProxy != 0) {
      //todo jaycen can we accomplish the same thing using 820? by defining IParticipantRegistry in the 820reg?
      require(
        IParticipant(participantProxy).getParticipantRegistry() == getParticipantRegistry(),
        "When using a participant proxy, you can only call the mint function with a participant defined in the current ParticipantRegistry contract"
      );
    } else if (onlyParticipantCallers == true) {
      emit InsufficientPermission(
        msg.sender,
        _operatorData,
        _value,
        _misc
      );
      revert("Only a supplier participant proxy can mint when 'onlyParticipantCallers' is true");
    }

    /// NOTE: do NOT use timeRegistered for any kind of verification
    /// it should only be used to keep a "soft" record for mint time
    /// ref: https://ethereum.stackexchange.com/a/9752
    CommodityLib.Commodity memory _commodity = CommodityLib.Commodity({
        category: uint64(1),
        timeRegistered: uint64(now), // solium-disable-line
        parentId: 0,
        value: uint256(_value),
        locked: false,
        misc: bytes(_misc)
    });
    uint newCRCId = commodities.push(_commodity).sub(1);
    require(newCRCId <= 18446744073709551616, "You can only mint a commodity in a valid index range");

    //TODO: make sure this is ok in production (maybe move to a diff func that invokes callrecipient internally)
    _transfer(0, _to, newCRCId);
    callRecipient(
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
