pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";

// todo non-transferable/approveable after mint (except by DEFAULT_ADMIN_ROLE)

/**
 * @title Issuance
 */
contract Issuance is ERC1155PresetMinterPauserUpgradeable {

  // function initialize(string memory _uri) public virtual initializer {
  //   super.initialize(_uri);
  // }

  function mintBatch(
    address _to,
    uint256[] memory _ids,
    uint256[] memory _amounts,
    bytes memory _data
  ) public override {
    // ids: 0, 1, 2
    // amounts: 100, 10, 50
    // token id 0 URI points to vintage information (e.g., 2018) nori.com/removal/0 -> { amount: 100, supplier: 1, vintage: 2018, ... }
    // token id 1 URI points to vintage information (e.g., 2019) nori.com/removal/1 -> { amount: 10, supplier: 1, vintage: 2019, ... }
    // token id 2 URI points to vintage information (e.g., 2020) nori.com/removal/2 -> { amount: 50, supplier: 1, vintage: 2020, ... }
  }

  function safeBatchTransferFrom(
    address _from,
    address _to,
    uint256[] memory _ids,
    uint256[] memory _amounts,
    bytes memory _data
  ) public override {
    // todo require to is a known market contract
    super.safeBatchTransferFrom(
      _from,
      _to,
      _ids,
      _amounts,
      _data
    );
  }
}