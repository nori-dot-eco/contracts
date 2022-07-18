// SPDX-License-Identifier: MIT
pragma solidity =0.8.15; // todo bump solidity version globally to latest

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import {FunctionDisabled, ArrayLengthMismatch} from "./SharedCustomErrors.sol";
import "./ICertificate.sol";
import "./Removal.sol";
// import "forge-std/console2.sol"; // todo

error ForbiddenTransferAfterMinting(); // todo error declaration consistency (inside-contract vs outside-of-contract)

/**
 * todo consider removing all batch functions from all contracts (seems gratuitous to include it when you can
 * usually achieve the same effect by inheriting multicall, OR using an external multicall contract)
 * todo what is _msgSenderERC721A
 * todo multicall (globally?)
 * todo we are using a git commit for the erc721a dep. bc v4.1 doesn't have a virtual approve function, but master does
 * todo remove all "see {}" syntax from natspec (this only works in the context of OZ contracts repos)
 * todo check that whenNotPaused on all mutating functions
 * todo check that all transfer functions call _beforeTokenTransfers
 * todo @dev vs @notice consistency
 */
contract Certificate is
  ICertificate,
  ERC721ABurnableUpgradeable, // todo is this accounting ok considering the certificate now has child tokens?
  ERC721AQueryableUpgradeable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  /**
   * @notice Role conferring operator permissions
   *
   * @dev This role is assigned to operators which can transfer certificates from an address to another by bypassing
   * the `_beforeTokenTransfer` hook.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");

  /**
   * @notice Role conferring the ability to release a certificates underlying removals
   */
  bytes32 public constant RELEASER_ROLE = keccak256("RELEASER_ROLE");

  /**
   * @notice Role conferring the ability to mint certificates
   */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /**
   * @notice Role conferring the ability to pause and unpause mutable functions of the contract
   */
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); // todo PausablePreset?

  mapping(uint256 => mapping(uint256 => uint256))
    private _removalBalancesOfCertificate;

  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _removalsOfCertificate; // todo rename

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  Removal private _removal; // todo I dont think I'm using this anymore

  // todo globally consider renaming tokenId -> certificateId / removalId

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Pauses all functions that can mutate state.
   *
   * @dev Used to effectively freeze a contract so that no state updates can occur.
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses all token transfers.
   *
   * @dev
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function unpause() external onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @notice Registers the address of the removal contract.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`
   */
  function registerContractAddresses(Removal removal)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _removal = Removal(removal);
  }

  function initialize() external initializerERC721A initializer {
    // todo validate initializers
    __Context_init_unchained();
    __ERC165_init_unchained();
    __ERC721A_init_unchained("Certificate", "NRT");
    __ERC721ABurnable_init_unchained();
    __ERC721AQueryable_init_unchained();
    __Pausable_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    // todo initialize with _removal and call _grantRole(_removal) here?
  }

  function releaseRemoval(
    uint256 certificateId,
    RemovalId removalId,
    uint256 amount
  ) external whenNotPaused onlyRole(RELEASER_ROLE) {
    // todo any way to guarantee this is only called when burning removals?
    // todo batch?
    // todo how are we tracking total released? Do the correct events get emitted in Removal.sol?
    // todo emit event
    _removalBalancesOfCertificate[certificateId][
      RemovalId.unwrap(removalId)
    ] -= amount;
    if (
      _removalBalancesOfCertificate[certificateId][ // todo access storage once (currently 2x)
        RemovalId.unwrap(removalId)
      ] == 0
    ) {
      _removalsOfCertificate[certificateId].remove(RemovalId.unwrap(removalId));
    }
  }

  /**
   * @dev Receives a batch of child tokens, the receiver token ID must be encoded in the field data.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused (enforced by `_beforeTokenTransfers`). // todo consistency in
   * how this requirement is worded
   * - // TODO other reqs
   */
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory removalIds,
    uint256[] memory removalAmounts,
    bytes memory data
  ) external returns (bytes4) {
    // todo onlyRole(minter_role)
    address recipient;
    assembly {
      recipient := mload(add(add(data, 32), 0))
    }
    _receiveRemovalBatch(recipient, removalIds, removalAmounts);
    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @dev Gives child balance for a specific child contract and child ID.
   */
  function balanceOfRemoval(
    uint256 certificateTokenId,
    uint256 removalTokenId // todo globally change type to RemovalId user defined type
  ) external view returns (uint256) {
    // todo cummulative balance for all child contracts version (use ERC721AQueryable balance funcs)
    return _removalBalancesOfCertificate[certificateTokenId][removalTokenId];
  }

  /**
   * @dev Returns the cumulative balance for all underlying removals of a certificate.
   */
  function balanceOf(
    uint256 certificateTokenId // todo rename? (e.g., blanceOfRemovals?)
  ) external view returns (uint256) {
    // todo cummulative balance for all child contracts version (use ERC721AQueryable balance funcs)
    uint256[] memory removals = this.removalsOfCertificate(certificateTokenId);
    uint256 total = 0;
    mapping(uint256 => uint256)
      storage removalBalancesOfCertificate = _removalBalancesOfCertificate[
        certificateTokenId
      ];
    for (uint256 i = 0; i < removals.length; ++i) {
      total += removalBalancesOfCertificate[removals[i]];
    }
    return total;
  }

  /**
   * @dev Returns the list of removal IDs for the given certificate ID. // todo maybe drop ID from names entirely?
   */
  function removalsOfCertificate(uint256 certificateId)
    external
    view
    returns (uint256[] memory)
  {
    return _removalsOfCertificate[certificateId].values();
  }

  /**
   * @dev Returns a list of certificate IDs that hold a balnce for a given removal ID.
   */
  function certificatesOfRemoval(RemovalId removalId)
    external
    view
    returns (uint256[] memory)
  {
    // todo consider using tokensOfOwnerIn to prevent out of gas possibilities that may prevent releasing removals
    uint256 totalSupply = this.totalSupply();
    uint256 totalNumberOfCertificates = 0;
    uint256[] memory certificates = new uint256[](totalSupply);
    for (uint256 i = 0; i < totalSupply; i++) {
      uint256 certificateId = certificates[i];
      if (
        _removalsOfCertificate[certificateId].contains(
          RemovalId.unwrap(removalId)
        )
      ) {
        certificates[i] = certificateId;
        totalNumberOfCertificates++;
      }
    }
    return _shrinkArray(certificates, totalNumberOfCertificates);
  }

  function _shrinkArray(uint256[] memory array, uint256 newLength)
    internal
    pure
    returns (uint256[] memory)
  {
    // todo verify that this is working as expected
    require(
      newLength <= array.length,
      "Array: length after shrinking larger than before"
    );
    // todo use new memory safe asembly syntax instead of the following
    /// @solidity memory-safe-assembly
    assembly {
      mstore(array, newLength)
    }
    return array;
  }

  /**
   * @dev See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(
      AccessControlEnumerableUpgradeable,
      ERC721AUpgradeable,
      IERC721AUpgradeable
    )
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function setApprovalForAll(address, bool)
    public
    pure
    override(ERC721AUpgradeable, IERC721AUpgradeable)
  {
    revert FunctionDisabled();
  }

  function approve(address, uint256)
    public
    pure
    override(ERC721AUpgradeable, IERC721AUpgradeable)
  {
    revert FunctionDisabled();
  }

  /**
   * @notice A hook that is called before all transfers and is used to disallow non-minting, non-burning, and non-
   * certificate-operator (conferred by the `CERTIFICATE_OPERATOR_ROLE` role) transfers
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks).
   *
   * ##### Requirements:
   *
   * // TODO
   */
  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal override whenNotPaused {
    bool isNotMinting = !(from == address(0));
    bool isNotBurning = !(to == address(0));
    bool isMissingOperatorRole = !hasRole(
      CERTIFICATE_OPERATOR_ROLE,
      _msgSender()
    );
    if (isNotMinting && isNotBurning && isMissingOperatorRole) {
      revert ForbiddenTransferAfterMinting();
    }
    super._beforeTokenTransfers(from, to, startTokenId, quantity);
  }

  function _receiveRemovalBatch(
    address recipient,
    uint256[] memory removalIds,
    uint256[] memory removalAmounts
  ) internal {
    _validateReceivedRemovalBatch(removalIds, removalAmounts);
    uint256 certificateId = _nextTokenId();
    _mint(recipient, 1); // todo consider _safeMint version?
    for (uint256 i = 0; i < removalIds.length; ++i) {
      _removalBalancesOfCertificate[certificateId][
        removalIds[i]
      ] += removalAmounts[i];
      _removalsOfCertificate[certificateId].add(removalIds[i]);
    }
    emit ReceiveRemovalBatch(
      _msgSender(),
      recipient,
      certificateId,
      removalIds,
      removalAmounts
    );
  }

  function _validateReceivedRemovalBatch(
    uint256[] memory removalIds,
    uint256[] memory removalAmounts
  ) internal pure {
    // todo share library since similar logic is used elsewhere to compare array lengths
    if (removalIds.length != removalAmounts.length) {
      revert ArrayLengthMismatch("removalIds", "removalAmounts");
    }
  }

  // todo write a test that checks that we can release burned certificate's removals
  // function burn() external {
  //    // needs to burn a whole certificate, which should also burn the internal removals
  // }

  /**
   * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each token will be the concatenation of the
   * `baseURI` and the `tokenId`. Empty by default, it can be overridden in child contracts.
   */
  function _baseURI() internal pure override returns (string memory) {
    return "https://nori.com/"; // todo
  }
}
