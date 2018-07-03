pragma solidity ^0.4.24;
import "./CRCV0.sol";


contract CRCV0_2_0 is CRCV0 {

  /// @notice Returns the total value of crcs owned by a specific address.
  /// @param _owner The owner address to check.
  function balanceOf(address _owner) public view returns (uint256 totalValue) {
    uint256 bundleBalance = BasicCommodity.balanceOf(_owner);
    uint256 supply = BasicCommodity.totalSupply();
    uint totalCrcValue = 0;
    
    for (uint i = 0; i < supply || i < bundleBalance; i++) {
      address ownerToCheck = BasicCommodity.ownerOf(i);
      if (ownerToCheck == _owner) {
        totalCrcValue += BasicCommodity.getCommodityValueByIndex(i);
      }
    }
    
    return totalCrcValue;
  }

}