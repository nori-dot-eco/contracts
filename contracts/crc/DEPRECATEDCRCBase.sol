pragma solidity ^0.4.18;

import "../commodity/CommodityLib.sol";
import "../commodity/DEPRECATEDCommodityStorage.sol";


/// @title Base contract for CRCs. Contains variables and functions unrelated
// to creating or storing the ledger
contract DEPRECATEDCRCBase is DEPRECATEDCommodityStorage {
    //todo jaycen not sure this file is even needed, maybe just combine it into storage.
    /// @notice Returns the total number of crcs currently in existence. todo jaycen can this be uint64 and also should this instead return .value of all comms?
    function getTotalSupplyByCategory(uint64 _category) public constant returns (uint256) {
        return DEPRECATEDCommodityStorage.getTotalSupply(_category);
    }
    
    function totalSupply() public constant returns (uint256) {
        return getTotalSupplyByCategory(1); //todo jaycen fix this static var when we understand crc tiers more
    }
}
