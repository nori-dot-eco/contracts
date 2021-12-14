pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

// todo non-transferable/approveable
// todo disable other mint functions

/**
 * @title Certificate
 */
contract Certificate is ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable {
  using SafeMathUpgradeable for uint;

  struct Source {
    uint256 removalId;
    uint256 amount;
  }

  /**
   * @dev a mapping of the certificate token ID -> sources
   */
  mapping(uint256 => Source[]) private _sources;
  /**
   * @dev auto incrementing token ID
   */
  uint256 private _latestTokenId = 0;

  function initialize() public virtual initializer {
    super.initialize("https://nori.com/api/certificate/{id}.json");
    __ERC1155Supply_init();
  }

  /**
   * @dev returns the removal IDs and the amounts of the sources
   */
  function sources(uint256 certificateId) public view returns (Source[] memory) {
    return _sources[certificateId];
  }

  /**
   * @dev mints the certificate (using a batch of certificate sources)
   * @param to The supplier address
   * @param removalAmounts the removal source amount
   * @param removalIds the removal source ids
   * @param data Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
   * @custom:example mint(address, 160, [100, 10, 50], [0, 1, 2])
   *  - token id 0 URI points to nori.com/api/certificate/0 -> { amount: 100, removalIds: [0, 1, 2], ... }
   *  - removalIds can be used to look up vintage years, e.g. 0 -> 2018
   */
  function mintBatch(
    address to,
    uint256[] memory removalIds,
    uint256[] memory removalAmounts,
    bytes memory data
  ) public override {
    // todo only allowed by market contract
    // todo require _sources[_latestTokenId] doesnt exist
    // todo require _sources[_latestTokenId][n] doesnt exist
    _latestTokenId = _latestTokenId.add(1);
    uint256 certificateAmount = 0;
    for (uint256 i = 0; i < removalIds.length; i++) {
      _sources[_latestTokenId][i] = Source({
        removalId: removalIds[i],
        amount: removalAmounts[i]
      });
      certificateAmount = certificateAmount.add(removalAmounts[i]);
    }
    super.mint(
      to,
      _latestTokenId,
      certificateAmount,
      data
    );
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override(ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable) {
    return super._beforeTokenTransfer(
      operator,
      from,
      to,
      ids,
      amounts,
      data
    );
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}