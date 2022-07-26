// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import {FunctionDisabled, ArrayLengthMismatch, SenderNotRemovalContract} from "./Errors.sol";
import "./Removal.sol";
import "./PausableAccessPreset.sol";
import "./ICertificate.sol";
import "./BytesLib.sol";

error ForbiddenTransferAfterMinting();

/**
 * todo bump solidity version globally to latest
 * todo benefit of using Interface vs contract?
 * todo error declaration consistency (inside-contract vs outside-of-contract)
 * todo document burning behavior
 * todo globally consider renaming tokenId -> certificateId / removalId
 * todo how hard would it be to use ERC721AStorage layout for child removals?
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
  ERC721ABurnableUpgradeable,
  ERC721AQueryableUpgradeable,
  MulticallUpgradeable,
  PausableAccessPreset
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using BytesLib for bytes;

  struct Balance {
    uint256 id;
    uint256 amount;
  }

  /**
   * @notice Role conferring operator permissions.
   *
   * @dev This role is assigned to operators which are the only addresses which can transfer certificates outside of
   * minting and burning.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");

  mapping(uint256 => mapping(uint256 => uint256))
    private _removalBalancesOfCertificate;

  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _removalsOfCertificate; // todo tests that ensure this is maintained correctly

  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _certificatesOfRemoval; // todo tests that ensure this is maintained correctly

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   * todo getter/setter
   */
  Removal private _removal;

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
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
    __Multicall_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender()); // todo global: doesnt this happen automatically?
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(CERTIFICATE_OPERATOR_ROLE, _msgSender());
  }

  /**
   * @notice Registers the address of the removal contract ontract
   *
   * @dev
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
    _removal = removal;
  }

  function releaseRemoval(
    uint256 certificateId,
    uint256 removalId,
    uint256 amount
  ) external whenNotPaused {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    // todo emit event?
    _removalBalancesOfCertificate[certificateId][removalId] -= amount;
    if (
      _removalBalancesOfCertificate[certificateId][removalId] == 0 // todo access storage once (currently 2x)
    ) {
      _removalsOfCertificate[certificateId].remove(removalId);
      _certificatesOfRemoval[removalId].remove(certificateId);
    }
  }

  /**
   * @dev Receives a batch of child tokens, the receiver token ID must be encoded in the field data.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused (enforced by `_beforeTokenTransfers`). // todo consistency in
   * how this requirement is worded
   * - `_msgSender` must be the removal contract.
   * - // TODO other reqs
   */
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] calldata removalIds,
    uint256[] calldata removalAmounts,
    bytes calldata data
  ) external returns (bytes4) {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    _receiveRemovalBatch(data.toAddress(), removalIds, removalAmounts);
    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @dev Returns the balance of a removal underlying a certificate
   */
  function balanceOfRemoval(uint256 certificateTokenId, uint256 removalTokenId)
    external
    view
    returns (uint256)
  {
    // todo batch
    return _removalBalancesOfCertificate[certificateTokenId][removalTokenId];
  }

  /**
   * @dev Returns the total number of certificates that have been minted (including burned ones)
   */
  function totalMinted() external view returns (uint256) {
    return _totalMinted();
  }

  /**
   * @dev Returns the list of removal IDs for the given certificate ID. // todo maybe drop ID from names entirely?
   */
  function removalsOfCertificate(uint256 certificateId)
    external
    view
    returns (Balance[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage removalIds = _removalsOfCertificate[certificateId];
    // todo only if it exists continue
    Balance[] memory removals = new Balance[](removalIds.length());
    for (uint256 i = 0; i < removalIds.length(); i++) {
      uint256 removalId = removalIds.at(i);
      removals[i] = Balance({
        id: removalId,
        amount: _removalBalancesOfCertificate[certificateId][removalId]
      });
    }
    return removals;
  }

  /**
   * @dev Returns the list of certificate IDs and balances for a given removal ID.
   */
  function certificatesOfRemoval(uint256 removalId)
    external
    view
    returns (Balance[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage certifificateIds = _certificatesOfRemoval[removalId];
    // todo only if it exists continue
    Balance[] memory certificates = new Balance[](certifificateIds.length());
    for (uint256 i = 0; i < certifificateIds.length(); i++) {
      uint256 certificateId = certifificateIds.at(i);
      certificates[i] = Balance({
        id: certificateId,
        amount: _removalBalancesOfCertificate[certificateId][removalId]
      });
    }
    return certificates;
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
   * certificate-operator (conferred by the `CERTIFICATE_OPERATOR_ROLE` role) transfers.
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
      _certificatesOfRemoval[removalIds[i]].add(certificateId);
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

  /**
   * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each token will be the concatenation of the
   * `baseURI` and the `tokenId`. Empty by default, it can be overridden in child contracts.
   */
  function _baseURI() internal pure override returns (string memory) {
    return "https://nori.com/"; // todo
  }
}
