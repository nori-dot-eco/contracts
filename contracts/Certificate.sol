// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import "./Errors.sol";
import "./Removal.sol";
import "./PausableAccessPreset.sol";

/**
 * todo document burning behavior
 * todo ERC721a exposes both _msgSender and _msgSenderERC721A -- what are the differences and implications?
 * todo check that all transfer functions (including those not exposed in this file) call _beforeTokenTransfers
 *
 * @title An ERC721a contract that issues non-transferable certificates of carbon removal.
 *
 * @author Nori Inc.
 *
 * @notice This contract issues sequentially increasing ERC721 token ids to purchasers of certificates of carbon
 * removal in Nori's marketplace. The carbon removals that supply each certificate are accounted for using ERC1155
 * tokens in the Removal contract. Upon purchase, ownership of the relevant Removal token ids and balances is
 * transfered to this contract.  Internally, `_removalBalancesOfCertificate` tracks the subset of those Removal
 * tokens and balances that belong to each specific certificate id.
 *
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 *   - all functions that mutate state are pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - CERTIFICATE_OPERATOR_ROLE
 *      - The only role that can transfer certificates after they are minted
 *    - PAUSER_ROLE
 *      - Can pause and unpause the contract
 *    - DEFAULT_ADMIN_ROLE
 *      - This is the only role that can add/revoke other accounts to any of the roles
 * - [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver)
 *   - A certificate is minted and internal accounting ties the certificate to the ERC1155 tokens upon receipt.
 *
 * ##### Inherits
 * TODO
 *
 * ##### Implements
 * TODO
 *
 * ##### Uses
 *
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 *   for EnumerableSetUpgradeable.Uintset
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract Certificate is
  ERC721ABurnableUpgradeable,
  ERC721AQueryableUpgradeable,
  MulticallUpgradeable,
  PausableAccessPreset
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

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

  mapping(uint256 => uint256) private _purchaseAmounts; // todo naming consistency for mappings (e.g, plural/non-plural)

  /*
   * todo Add tests that ensure _removalsOfCertificate/_certificatesOfRemoval can't deviate from Removal.sol balances
   */
  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _removalsOfCertificate;

  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _certificatesOfRemoval;

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  Removal private _removal;

  event ReceiveRemovalBatch(
    address from,
    address indexed recipient,
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] removalAmounts
  );

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializerERC721A initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __ERC721A_init_unchained("Certificate", "NCCR");
    __ERC721ABurnable_init_unchained();
    __ERC721AQueryable_init_unchained();
    __Pausable_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Multicall_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(CERTIFICATE_OPERATOR_ROLE, _msgSender());
  }

  /**
   * @notice Registers the address of the Removal contract.
   *
   * @dev This function is called as part of the market deployment process to register relevant contract
   * addresses among market contracts.
   *
   * @param removal The address of the Removal contract.
   *
   * ##### Requirements:
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

  // todo is whenNotPaused redundant since it's only called from a pausable function on the removal contract?
  /**
   * @notice Removes `amount` of this `removalId` from the specified `certificateId` in the internal accounting
   * that keeps track of which removals belong to a given certificate.
   *
   * @dev This function can only ever be called by the Removal contract, and should be called in the course of
   * executing Removal.release. Burning the corresponding removal balance from the Certificate contract happens
   * in Removal.release.
   *
   * @param certificateId The id of the certificate from which this removal is being released.
   * @param removalId The removal token to release.
   * @param amount The balance of the removal token to release.
   *
   * ##### Requirements:
   * - Can only be called by the Removal contract.
   * - Can only be used when contract is not paused.
   */
  function releaseRemoval(
    uint256 certificateId,
    uint256 removalId,
    uint256 amount
  ) external whenNotPaused {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    // todo Emit event when removal is released if TransferSingle events can be emitted with to: addr(0) in other cases
    // todo decrease number of storage reads
    _removalBalancesOfCertificate[certificateId][removalId] -= amount;
    if (_removalBalancesOfCertificate[certificateId][removalId] == 0) {
      _removalsOfCertificate[certificateId].remove(removalId);
      _certificatesOfRemoval[removalId].remove(certificateId);
    }
  }

  /**
   * @dev Receives a batch of child tokens, the certificate recipient and amount must be encoded in the field data.
   *
   * @param removalIds The array of ERC1155 Removal token ids being received in this batch.
   * @param removalAmounts The array of balances being received for each corresponding token id.
   * @param data Bytes that encode the certificate's recipient address and total amount.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused (enforced by `_beforeTokenTransfers`).
   * - `_msgSender` must be the removal contract.
   */
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] calldata removalIds,
    uint256[] calldata removalAmounts,
    bytes calldata data
  ) external whenNotPaused returns (bytes4) {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    (address recipient, uint256 certificateAmount) = abi.decode(
      data,
      (address, uint256)
    );
    _receiveRemovalBatch({
      recipient: recipient,
      certificateAmount: certificateAmount,
      removalIds: removalIds,
      removalAmounts: removalAmounts
    });
    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @notice Returns the balance of a removal token underlying a certificate.
   *
   * @param certificateTokenId The certificate token to retrieve the balance for.
   * @param removalTokenId The removal token for which to retrieve the balance for this certificate.
   */
  function balanceOfRemoval(uint256 certificateTokenId, uint256 removalTokenId)
    external
    view
    returns (uint256)
  {
    return _removalBalancesOfCertificate[certificateTokenId][removalTokenId];
  }

  /**
   * @notice Returns the total number of certificates that have been minted (including burned ones)
   */
  function totalMinted() external view returns (uint256) {
    return _totalMinted();
  }

  /**
   * @notice Returns the original number of tonnes of carbon removals purchased when the specified certificate
   * was created.
   *
   * @param certificateId The certificate to retrieve the original amount for.
   */
  function purchaseAmount(uint256 certificateId)
    external
    view
    returns (uint256)
  {
    return _purchaseAmounts[certificateId];
  }

  /**
   * @notice Returns the list of removal IDs that comprise the given certificate ID.
   *
   * @param certificateId The certificate ID for which to retrieve underlying removal IDs.
   */
  function removalsOfCertificate(uint256 certificateId)
    external
    view
    returns (Balance[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage removalIds = _removalsOfCertificate[certificateId];
    uint256 numberOfRemovals = removalIds.length();
    Balance[] memory removals = new Balance[](numberOfRemovals);
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < numberOfRemovals; ++i) {
        uint256 removalId = removalIds.at(i);
        removals[i] = Balance({
          id: removalId,
          amount: _removalBalancesOfCertificate[certificateId][removalId]
        });
      }
    }
    return removals;
  }

  /**
   * @notice Returns the list of certificate IDs the given removal ID has been included in, and the balance included
   * in each certificate.
   *
   * @param removalId The removal token ID for which to retrieve all relevant certificate IDs and balances.
   * @return An array of Balance structs, each of which includes an `id` and `amount`.
   */
  function certificatesOfRemoval(uint256 removalId)
    external
    view
    returns (Balance[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage certificateIds = _certificatesOfRemoval[removalId];
    uint256 numberOfCertificates = certificateIds.length();
    Balance[] memory certificates = new Balance[](numberOfCertificates);
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < numberOfCertificates; ++i) {
        uint256 certificateId = certificateIds.at(i);
        certificates[i] = Balance({
          id: certificateId,
          amount: _removalBalancesOfCertificate[certificateId][removalId]
        });
      }
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

  /**
   * @dev Override to disable ERC721 operator approvals, since certificate tokens are non-transferable.
   * See
   */
  function setApprovalForAll(address, bool)
    public
    pure
    override(ERC721AUpgradeable, IERC721AUpgradeable)
  {
    revert FunctionDisabled();
  }

  /**
   * @dev Override to disable ERC721 operator approvals, since certificate tokens are non-transferable.
   */
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

  /**
   * @dev Called when a batch of ERC1155 Removal tokens are sent to this contract.
   * Mints a new certificate token to the next sequential ID and updates the internal data structures
   * that track the relationship between the certificate and its constituent removal tokens and balances.
   *
   * @param recipient The address receiving the new certificate.
   * @param certificateAmount The total number of tonnes of carbon removals represented by the new certificate.
   * @param removalIds The removal token IDs that are being included in the certificate.
   * @param removalAmounts The balances of each corresponding removal token that are being included in the certificate.
   */
  function _receiveRemovalBatch(
    address recipient,
    uint256 certificateAmount,
    uint256[] memory removalIds,
    uint256[] memory removalAmounts
  ) internal {
    _validateReceivedRemovalBatch(removalIds, removalAmounts);
    uint256 certificateId = _nextTokenId();
    _purchaseAmounts[certificateId] = certificateAmount;
    _mint(recipient, 1); // todo should we be using _mint or _safeMint for ERC721A
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

  /**
   * @notice Returns the sender of the transaction.
   * @dev In all cases currently, we expect that the `_msgSender()`, `_msgSenderERC721A()` and `msg.sender` all return
   * the same value. As such, this function is provided solely for compatibility with OpenZeppelin and ERC721A
   * contracts. For more, see [here](https://github.com/chiru-labs/ERC721A/pull/281) and [here](
   * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol).
   * @return For regular transactions it returns msg.sender and for meta transactions it *can* be used to return the end
   * user (rather than the relayer)
   */
  function _msgSenderERC721A() internal view override returns (address) {
    return _msgSender();
  }

  /**
   * @dev Validates the incoming batch of removal token data to ensure the number of IDs and the number of amounts
   * specified are the same length.
   *
   * @param removalIds An array of removal token ids.
   * @param removalAmounts An array of amounts.
   */
  function _validateReceivedRemovalBatch(
    uint256[] memory removalIds,
    uint256[] memory removalAmounts
  ) internal pure {
    // todo De-duplicate code that checks array-length (e.g., library or base contract)
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
