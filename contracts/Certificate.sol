// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "./ERC1155PresetPausableNonTransferrable.sol";

// todo non-transferable/approveable
// todo disable other mint functions
// todo whenNotPasused
// todo setApprovalForAll should only work when called on accounts with CERTIFICATE_OPERATOR_ROLE
// todo consider not inheriting pausable base contract and reverting with custom error for consistency
// todo use OZ counters for incrementing and decrementing

error ForbiddenFunctionCall();

/**
 * @title Certificate
 */
contract Certificate is ERC1155PresetPausableNonTransferrable {
  struct Source {
    uint256 removalId;
    uint256 amount;
  }

  /**
   * @notice Emitted on creation of a certificate of carbon removal.
   */
  event CertificateCreated(
    address indexed recipient,
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] amounts
  );

  /**
   * @dev a mapping of the certificate token ID -> sources
   */
  mapping(uint256 => Source[]) private _sources;

  /**
   * @dev auto incrementing token ID
   */
  uint256 private _latestTokenId;

  function initialize() external initializer {
    // todo verify all inherited unchained initializers are called
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    __ERC1155_init_unchained("https://nori.com/api/certificate/{id}.json");
    __Pausable_init_unchained();
    __ERC1155PresetMinterPauser_init_unchained(
      "https://nori.com/api/certificate/{id}.json"
    );
    __ERC1155PresetPausableNonTransferrable_init_unchained();
    _latestTokenId = 0;
  }

  /**
   * @dev mints the certificate (using a batch of certificate sources)
   * @param to The supplier address
   * @param removalAmounts the removal source amount
   * @param removalIds the removal source ids
   * @param data Additional data with no specified format, MUST be sent
   * unaltered in call to `onERC1155Received` on `_to`
   *
   * @custom:example mint(address, 160, [100, 10, 50], [0, 1, 2])
   *  - token id 0 URI points to nori.com/api/certificate/0 -> { amount: 100, removalIds: [0, 1, 2], ... }
   *  - removalIds can be used to look up vintage years, e.g. 0 -> 2018
   */
  function mintBatch(
    address to, // todo array?
    uint256[] memory removalIds,
    uint256[] memory removalAmounts,
    bytes memory data // todo array?
  ) public override {
    uint256 certificateAmount = abi.decode(data, (uint256)); // todo verify amount
    uint256 tokenId = _latestTokenId;
    // todo extract to base contract and overload here
    // todo use modified mintCertificate instead of mintBatch. mintBatch should be used to mint multi certificates.
    // todo only allowed by market contract
    // todo require _sources[_latestTokenId] doesnt exist
    // todo require _sources[_latestTokenId][n] doesnt exist
    // todo is there a better way to verify that no removal amount == 0?
    for (uint256 i = 0; i < removalIds.length; i++) {
      if (removalAmounts[i] == 0) {
        revert("Certificate: Removal amount 0");
      } else {
        _sources[tokenId].push(
          Source({removalId: removalIds[i], amount: removalAmounts[i]})
        );
      }
    }
    _latestTokenId = tokenId + 1;
    emit CertificateCreated(to, tokenId, removalIds, removalAmounts);
    super.mint(to, tokenId, certificateAmount, data);
  }

  /**
   * @dev Use the `mintBatch` function instead.
   */
  function mint(
    address,
    uint256,
    uint256,
    bytes memory
  ) public pure override {
    revert ForbiddenFunctionCall(); // todo is this really what we want?
  }

  /**
   * @dev returns the removal IDs and the amounts of the sources
   */
  function sources(uint256 certificateId)
    public
    view
    returns (Source[] memory)
  {
    return _sources[certificateId];
  }
}
