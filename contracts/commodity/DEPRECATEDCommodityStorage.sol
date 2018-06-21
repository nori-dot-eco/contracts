pragma solidity ^0.4.18;

import "../commodity/CommodityLib.sol";


contract DEPRECATEDCommodityStorage {
    /// @dev An array containing the Commodity struct for all commodities in existence. The ID
    ///  of each commodity is actually an index into this array.
    CommodityLib.Commodity[] public commodities;

    function getTotalSupply(uint64 _category) public view returns (uint256) {
        uint256 count;
        for (uint256 i = 0; i < commodities.length; i++) {
            if (commodities[i].category == _category) {
                count++;
            }
        }
        return count;
    }

    function getCommodityValueByIndex(uint256 _index) public view returns (uint256) {
        return commodities[_index].value;
    }

    function getCommodityCategoryByIndex(uint256 _index) public view returns (uint256) {
        return commodities[_index].category;
    }

    function getTotalSupply() public view returns (uint256) {
        return commodities.length - 1;
    }

    function _totalSupply() internal view returns (uint256) {
        return commodities.length - 1;
    }
}
