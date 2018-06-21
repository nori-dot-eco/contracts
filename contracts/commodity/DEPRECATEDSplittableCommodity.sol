pragma solidity ^0.4.18;

import "./DEPRECATEDMintableCommodity.sol";


contract DEPRECATEDSplittableCommodity is DEPRECATEDMintableCommodity {

    event Split(address indexed to, uint256 amount, uint64 parentId, address indexed operator, bytes operatorData);

    //todo jaycen implement a version where owner is splitting vs market is splitting
    //todo jaycen, maybe if we dont store data for misc in the new commodity and instead rely on front end to retrieve based on parentid to save gas
    function split(uint _tokenId, address _to, uint256 _ammount) public {
        commodities[_tokenId].value -= _ammount;
        uint64 newCommodityIndex = mint(_to, "", _ammount, "");
        //todo jaycen check that this 64uint conversion is ok
        commodities[newCommodityIndex].misc = commodities[_tokenId].misc;
        //todo jaycen somehow move this into the mint/transfer scope so that locking happens only in one place
        commodities[newCommodityIndex].locked = true;
        
        emit Split(_to, _ammount, newCommodityIndex, msg.sender, "");
    }
}