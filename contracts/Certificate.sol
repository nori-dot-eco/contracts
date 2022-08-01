// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import "./Errors.sol";
import "./Removal.sol";
import "./PausableAccessPreset.sol";
import "./ICertificate.sol";

/**
 * todo document burning behavior
 * todo ERC721a exposes both _msgSender and _msgSenderERC721A -- what are the differences and implications?
 * todo check that all transfer functions (including those not exposed in this file) call _beforeTokenTransfers
 *
 * @title An ERC721a contract that issues non-transferable certificates of carbon removal.
 *
 * @author Nori Inc.
 *
 * @notice
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
 * - [Can receive ERC-1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver)
 *   - BridgedPolygonNORI is wrapped and grants are created upon receipt
 * - [Limited ERC-777 functionality](https://eips.ethereum.org/EIPS/eip-777)
 *   - burn and operatorBurn will revert as only the internal variants are expected to be used
 *   - mint is not callable as only the internal variants are expected to be used when wrapping BridgedPolygonNORI
 * - [Limited ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/erc20)
 *   - mint is not callable as only the internal variants are expected to be used when wrapping BridgedPolygonNORI
 *   - burn functions are not externally callable
 * - [Extended Wrapped ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Wrapper)
 *   - In absence of a grant LockedNORI functions identically to a standard wrapped token
 *   - when a grant is defined, LockedNORI follows the restrictions noted above
 *
 * ##### Inherits
 *
 * ##### Implements
 *
 *
 * ##### Uses
 *
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 *   for EnumerableSetUpgradeable.Uintset
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract Certificate is
  ICertificate,
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

  mapping(uint256 => uint256) private _balances; // todo naming consistency for mappings (e.g, plural/non-plural)

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

  // todo is whenNotPaused redundant since it's only called from a pausable function on the removal contract?
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
   * @dev Receives a batch of child tokens, the receiver token ID must be encoded in the field data.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused (enforced by `_beforeTokenTransfers`).
   * - `_msgSender` must be the removal contract.
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
   * @dev Returns the balance of a removal underlying a certificate
   */
  function balanceOfRemoval(uint256 certificateTokenId, uint256 removalTokenId)
    external
    view
    returns (uint256)
  {
    return _removalBalancesOfCertificate[certificateTokenId][removalTokenId];
  }

  /**
   * @dev Returns the total number of certificates that have been minted (including burned ones)
   */
  function totalMinted() external view returns (uint256) {
    return _totalMinted();
  }

  function originalBalanceOf(uint256 certificateId)
    external
    view
    returns (uint256)
  {
    return _balances[certificateId];
  }

  /**
   * @dev Returns the list of removal IDs for the given certificate ID.
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
   * @dev Returns the list of certificate IDs and balances for a given removal ID.
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
    uint256 certificateAmount,
    uint256[] memory removalIds,
    uint256[] memory removalAmounts
  ) internal {
    _validateReceivedRemovalBatch(removalIds, removalAmounts);
    uint256 certificateId = _nextTokenId();
    _balances[certificateId] = certificateAmount;
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
