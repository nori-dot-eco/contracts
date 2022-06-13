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
// todo whenNotPasused
// todo can we upgrade lockedNORI with new comments? (would love to see consistency in behaviors/requirements using alpha-numerical lists)
// todo consider not inheriting pausable 1155 contract so we can use custom errors
// todo document that all things in requirements list must evaluate to true for a function

/**
 * @title Certificate
 */
contract Certificate is
  ERC1155PresetMinterPauserUpgradeable,
  ERC1155SupplyUpgradeable
{
  error ForbiddenTransferAfterMinting();
  error ForbiddenFunctionCall();

  /**
   * @notice Role conferring operator permissions
   * @dev This role is assigned to operators which can transfer certificates from an address to another by bypassing
   * the `_beforeTokenTransfer` hook.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");

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

  /**
   * @notice A hook that is called before all transfers and is used to disallow non-minting, non-burning, and transfers
   * invoked by addresses which do not have the `CERTIFICATE_OPERATOR_ROLE` role.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * A. The contract must not be paused
   * B. One of the following must be true:
   *    1. the operation is minting
   *    2. the operation is burning
   *    3. the operation is transferring and the operator has the `CERTIFICATE_OPERATOR_ROLE` role
   *
   * ##### Behaviors (todo: add behaviors and requirements to all function natspec)
   *
   * A. Reverts with `ForbiddenTransferAfterMinting` if none of the above requirements for requirement A are met.
   * B. Reverts with the string `"Pausable: paused"` if the contract is paused // todo consider not inheriting pausable
   * base contract and reverting with custom error for consistency
   *
   */
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
    whenNotPaused
  {
    bool isMinting = from != address(0);
    bool isBurning = to != address(0);
    if (
      (isMinting || isBurning) || !hasRole(CERTIFICATE_OPERATOR_ROLE, operator)
    ) {
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
