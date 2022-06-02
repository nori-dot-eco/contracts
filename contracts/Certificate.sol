// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";

// import "hardhat/console.sol"; // todo

// todo non-transferable/approveable
// todo disable other mint functions

/**
 * @title Certificate
 */
contract Certificate is
  ERC1155PresetMinterPauserUpgradeable,
  ERC1155SupplyUpgradeable
{
  error ForbiddenTransferAfterMinting();
  error ForbiddenFunctionCall();

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

  function initialize() public virtual initializer {
    super.initialize("https://nori.com/api/certificate/{id}.json");
    __ERC1155Supply_init_unchained();
    _latestTokenId = 0;
  }

  function addMinter(address _minter) public {
    require(
      hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
      "Certificate: missing minter role"
    );
    _setupRole(MINTER_ROLE, _minter);
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
    address to,
    uint256[] memory removalIds,
    uint256[] memory removalAmounts,
    bytes memory data
  ) public override {
    uint256 certificateAmount = abi.decode(data, (uint256));
    // todo use modified mintCertificate instead of mintBatch. mintBatch should be used to mint multi certificates.
    // todo only allowed by market contract
    // todo require _sources[_latestTokenId] doesnt exist
    // todo require _sources[_latestTokenId][n] doesnt exist
    for (uint256 i = 0; i < removalIds.length; i++) {
      if (removalAmounts[i] == 0) {
        revert("Certificate: Removal amount 0");
      } else {
        // todo try filtering out the zero amountsbefore calling mint; revert if any are zero
        _sources[_latestTokenId].push(
          Source({removalId: removalIds[i], amount: removalAmounts[i]})
        );
      }
    }
    super.mint(to, _latestTokenId, certificateAmount, data);
    emit CertificateCreated(to, _latestTokenId, removalIds, removalAmounts);

    _latestTokenId = _latestTokenId += 1;
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
    revert ForbiddenFunctionCall();
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

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  )
    internal
    override(ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable)
  {
    if (from != address(0)) {
      revert ForbiddenTransferAfterMinting();
    }
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
