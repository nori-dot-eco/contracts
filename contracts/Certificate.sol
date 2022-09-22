// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import "./Errors.sol";
import "./Removal.sol";
import "./AccessPresetPausable.sol";

/**
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
 * ##### Additional behaviors and features:
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
 * pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - `CERTIFICATE_OPERATOR_ROLE`: The only role that can transfer certificates after they are minted
 *    - `PAUSER_ROLE`: Can pause and unpause the contract
 *    - `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles
 * - [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver): A
 * certificate is minted and internal accounting ties the certificate to the ERC1155 tokens upon receipt.
 *
 * ##### Inherits:
 *
 * - [ERC721Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721)
 * - [ERC721Burnable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Burnable)
 * - [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements:
 *
 * - [IERC721](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721)
 * - [IERC721Metadata](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Metadata)
 * - [IERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Enumerable)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses:
 *
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 * for `EnumerableSetUpgradeable.UintSet`.
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 */
contract Certificate is
  ERC721ABurnableUpgradeable,
  ERC721AQueryableUpgradeable,
  MulticallUpgradeable,
  AccessPresetPausable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  /**
   * @notice The amount of balance and the removal ID that was used for a certificate.
   */
  struct Balance {
    uint256 id;
    uint256 amount;
  }

  /**
   * @notice Role conferring operator permissions.
   *
   * @dev Assigned to operators which are the only addresses which can transfer certificates outside of
   * minting and burning.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");

  /**
   * @notice Keeps track of the balances for each removal of a certificate.
   */
  mapping(uint256 => mapping(uint256 => uint256))
    private _removalBalancesOfCertificate;

  /**
   * @notice Keeps track of the original purchase amount for a certificate.
   */
  mapping(uint256 => uint256) private _purchaseAmounts;

  /**
   * @notice Keeps track of the removals used for a given certificate.
   */
  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _removalsOfCertificate;

  /**
   * @notice Keeps track of the certificates created from a given removal.
   */
  mapping(uint256 => EnumerableSetUpgradeable.UintSet)
    private _certificatesOfRemoval;

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  Removal private _removal;

  /**
   * @notice Base URI for token metadata
   */
  string private _baseURIValue;

  /**
   * @notice Emitted when a batch of removals is received to create a Certificate.
   * @param from The sender's address.
   * @param recipient The recipient address.
   * @param certificateId The ID of the certificate that the removals mint.
   * @param removalIds The removal IDs used for the certificate.
   * @param removalAmounts The amounts from each removal used for the certificate.
   */
  event ReceiveRemovalBatch(
    address from,
    address indexed recipient,
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] removalAmounts
  );

  /**
   * @notice Emitted when a removal releases from a Certificate.
   * @param certificatedId The certificate to connected to the removal.
   * @param removalId The removal to update the balance for.
   * @param amount The amount removed from the certificate.
   */
  event RemovalReleased(
    uint256 indexed certificatedId,
    uint256 indexed removalId,
    uint256 amount
  );

  /**
   * @notice Emitted on updating the addresses for contracts.
   *
   * @param removal The address of the new `market` contract.
   */
  event ContractAddressesRegistered(Removal removal);

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize(string memory baseURI)
    external
    initializerERC721A
    initializer
  {
    _baseURIValue = baseURI;
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
   * Emits a `ContractAddressesRegistered` event.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`
   *
   * @param removal The address of the Removal contract.
   */
  function registerContractAddresses(Removal removal)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _removal = removal;
    emit ContractAddressesRegistered(removal);
  }

  /**
   * @notice Removes `amount` of this `removalId` from the specified `certificateId` in the internal accounting
   * that keeps track of which removals belong to a given certificate.
   *
   * @dev This function can only ever be called by the Removal contract, and should be called in the course of
   * executing `Removal.release`. Burning the corresponding removal balance from the Certificate contract happens
   * in `Removal.release`.
   *
   * Emits a `RemovalReleased` event.
   *
   * ##### Requirements:
   * - Can only be called by the Removal contract.
   * - Can only be used when contract is not paused.
   *
   * @param certificateId The ID of the certificate from which the removals will be released.
   * @param removalId The removal ID to release.
   * @param amount The balance of the removal to release.
   */
  function releaseRemoval(
    uint256 certificateId,
    uint256 removalId,
    uint256 amount
  ) external whenNotPaused {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    _removalBalancesOfCertificate[certificateId][removalId] -= amount;
    if (_removalBalancesOfCertificate[certificateId][removalId] == 0) {
      _removalsOfCertificate[certificateId].remove(removalId);
      _certificatesOfRemoval[removalId].remove(certificateId);
    }
    emit RemovalReleased(certificateId, removalId, amount);
  }

  /**
   * @notice Receives a batch of child tokens, the certificate recipient and amount must be encoded in the field data.
   *
   * @dev See [IERC1155Receiver](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.
   *
   * ##### Requirements:
   * - This contract must not be paused (enforced by `_beforeTokenTransfers`).
   * - `_msgSender` must be the removal contract.
   *
   * @param removalIds The array of ERC1155 Removal IDs received.
   * @param removalAmounts The removal amounts per each removal ID.
   * @param data The bytes that encode the certificate's recipient address and total amount.
   * @return The selector of the function.
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
   * @return The balance of a removal used for this certificate.
   */
  function balanceOfRemoval(uint256 certificateTokenId, uint256 removalTokenId)
    external
    view
    returns (uint256)
  {
    return _removalBalancesOfCertificate[certificateTokenId][removalTokenId];
  }

  /**
   * @notice Returns the address of the `Removal` contract.
   *
   * @return removalAddress address of the `Removal` contract.
   */
  function removalAddress() external view returns (address) {
    return address(_removal);
  }

  /**
   * @notice Returns the total number of certificates that have been minted.
   *
   * @dev Includes burned certificates.
   *
   * @return totalMinted Total number of certificates that have been minted.
   */
  function totalMinted() external view returns (uint256) {
    return _totalMinted();
  }

  /**
   * @notice Returns the original number of tonnes of carbon removals purchased at the time of the purchase.
   *
   * @param certificateId The certificate to retrieve the original amount for.
   * @return The tonnes of carbon removal purchased for the certificate.
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
   * @return The removals comprising the certificate.
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
   *
   * ##### Requirements:
   *
   * - This contract must not be paused.
   * - Can only be used when the caller has the `CERTIFICATE_OPERATOR_ROLE`
   *
   */
  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal virtual override whenNotPaused {
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
   * @notice Creates a new certificate for a batch of removals.
   *
   * @dev Mints a new certificate token to the next sequential ID and updates the internal data structures
   * that track the relationship between the certificate and its constituent removal tokens and balances.
   *
   * Emits a `ReceiveRemovalBatch` event.
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
    _mint(recipient, 1);
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
   *
   * @dev In all cases currently, we expect that the `_msgSender()`, `_msgSenderERC721A()` and `msg.sender` all return
   * the same value. As such, this function exists solely for compatibility with OpenZeppelin and ERC721A
   * contracts. For more, see [here](https://github.com/chiru-labs/ERC721A/pull/281) and [here](
   * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol).
   *
   * @return For regular transactions it returns msg.sender and for meta transactions it *can* be used to return the end
   * user (rather than the relayer)
   */
  function _msgSenderERC721A() internal view override returns (address) {
    return _msgSender();
  }

  /**
   * @notice The baseUri for the certificate token.
   *
   * @dev Base URI for computing `tokenURI`. If set, the resulting URI for each token will be the concatenation of the
   * `baseURI` and the `tokenId`. Empty by default, it can be overridden in child contracts.
   */
  function _baseURI() internal view override returns (string memory) {
    return _baseURIValue;
  }

  /**
   * @notice Validates the incoming batch of removal token data by comparing the lengths of IDs and amounts.
   *
   * @dev Reverts if the array lengths do not match.
   *
   * @param removalIds Array of removal IDs.
   * @param removalAmounts Array of removal amounts.
   */
  function _validateReceivedRemovalBatch(
    uint256[] memory removalIds,
    uint256[] memory removalAmounts
  ) internal pure {
    if (removalIds.length != removalAmounts.length) {
      revert ArrayLengthMismatch("removalIds", "removalAmounts");
    }
  }
}
