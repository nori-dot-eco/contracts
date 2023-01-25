// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import "./AccessPresetPausable.sol";
import "./ArrayLib.sol";
import "./Errors.sol";
import "./ICertificate.sol";
import "./IRemoval.sol";

/**
 * @title An ERC721a contract that issues non-transferable certificates of carbon removal.
 * @author Nori Inc.
 * @notice This contract issues sequentially increasing ERC721 token IDs to purchasers of certificates of carbon
 * removal in Nori's marketplace. The carbon removals that supply each certificate are accounted for using ERC1155
 * tokens in the Removal contract. Upon purchase, ownership of the relevant Removal token IDs and balances is
 * transferred to this contract.
 *
 *
 * ##### Additional behaviors and features:
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
 * pausable.
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - `CERTIFICATE_OPERATOR_ROLE`: The only role that can transfer certificates after they are minted.
 *    - `PAUSER_ROLE`: Can pause and unpause the contract.
 *    - `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles.
 * - [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver): A
 * certificate is minted and internal accounting ties the certificate to the ERC1155 tokens upon receipt.
 *
 * ##### Inherits:
 *
 * - [ERC721AUpgradeable](https://github.com/chiru-labs/ERC721A/blob/v4.2.3/contracts/ERC721A.sol)
 * - [ERC721ABurnableUpgradeable](
 * https://github.com/chiru-labs/ERC721A/blob/v4.2.3/contracts/extensions/ERC721ABurnable.sol)
 * - [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 * - [AccessPresetPausable](../docs/AccessPresetPausable.md)
 *
 * ##### Implements:
 *
 * - [IERC721](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721)
 * - [IERC721Metadata](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Metadata)
 * - [IERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Enumerable)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 */
contract Certificate is
  ICertificate,
  ERC721ABurnableUpgradeable,
  ERC721AQueryableUpgradeable,
  MulticallUpgradeable,
  AccessPresetPausable
{
  using UInt256ArrayLib for uint256[];

  /**
   * @notice The data that is passed to the `onERC1155BatchReceived` function data parameter when creating a new
   * certificate.
   * @dev This struct is used to pass data to the `onERC1155BatchReceived` function when creating a new certificate.
   *
   * @param isReplacement A bool used to differentiate between a token batch being received to create a new
   * certificate and a token batch being received as a replacement for previously released removals.
   * @param recipient The address is the address that will receive the new certificate.
   * @param certificateAmount The amount of the certificate that will be minted.
   * @param purchasingTokenAddress The address is the address of the token that was used to purchase the certificate.
   * @param priceMultiple The number of purchasing tokens required to purchase one NRT.
   * @param noriFeePercentage The fee percentage charged by Nori at the time of this purchase.
   */
  struct CertificateData {
    bool isReplacement;
    address recipient;
    uint256 certificateAmount;
    address purchasingTokenAddress;
    uint256 priceMultiple;
    uint256 noriFeePercentage;
  }

  /**
   * @notice Role conferring operator permissions.
   * @dev Assigned to operators which are the only addresses which can transfer certificates outside
   * minting and burning.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");
  /**
   * @notice Keeps track of the original purchase amount for a certificate.
   */
  mapping(uint256 => uint256) private _purchaseAmounts;

  /**
   * @notice Keeps track of any discrepancy between the total number of NRTs guaranteed by this contract and the
   * number of NRTs currently held, expressed as an unsigned int.
   * @dev This is used to provide a redundant, transparent account of the number of NRTs that may still need to be
   * replaced in the case of released removals. This number should only be non-zero if removals are in the process of
   * being replaced.
   */
  uint256 private _nrtDeficit;

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  IRemoval private _removal;

  /**
   * @notice Base URI for token metadata.
   */
  string private _baseURIValue;

  /**
   * @notice Emitted when a batch of removals is received to create a certificate.
   * @param from The sender's address.
   * @param recipient The recipient address.
   * @param certificateId The ID of the certificate that the removals mint.
   * @param certificateAmount The total number of NRTs retired in this certificate.
   * @param removalIds The removal IDs used for the certificate.
   * @param removalAmounts The amounts from each removal used for the certificate.
   * @param purchasingTokenAddress The address of the token used to purchase the certificate.
   * @param priceMultiple The number of purchasing tokens required to buy one NRT.
   * @param noriFeePercentage The fee percentage charged by Nori at the time of this purchase.
   */
  event ReceiveRemovalBatch(
    address from,
    address indexed recipient,
    uint256 indexed certificateId,
    uint256 certificateAmount,
    uint256[] removalIds,
    uint256[] removalAmounts,
    address purchasingTokenAddress,
    uint256 priceMultiple,
    uint256 noriFeePercentage
  );

  /**
   * @notice Emitted on updating the addresses for contracts.
   * @param removal The address of the new Removal contract.
   */
  event RegisterContractAddresses(IRemoval removal);

  /**
   * @notice Locks the contract, preventing any future re-initialization.
   * @dev See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initialize the Certificate contract.
   * @param baseURI The base URI for all certificate NFTs.
   */
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
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    _grantRole({role: PAUSER_ROLE, account: _msgSender()});
    _grantRole({role: CERTIFICATE_OPERATOR_ROLE, account: _msgSender()});
  }

  /**
   * @notice Register the address of the Removal contract.
   * @dev This function emits a `RegisterContractAddresses` event.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
   * @param removal The address of the Removal contract.
   */
  function registerContractAddresses(IRemoval removal)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _removal = removal;
    emit RegisterContractAddresses({removal: removal});
  }

  /**
   * @notice Used to increment the deficit counter when removals are burned from this contract.
   */
  function incrementNrtDeficit(uint256 amount) external whenNotPaused {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    _nrtDeficit += amount;
  }

  /**
   * @notice Receive a batch of child tokens.
   * @dev See [IERC1155Receiver](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.
   *
   * ##### Requirements:
   * - This contract must not be paused (enforced by `_beforeTokenTransfers`).
   * - `_msgSender` must be the removal contract.
   * - The certificate recipient and amount must be encoded in the `data` parameter.
   * @param removalIds The array of ERC1155 Removal IDs received.
   * @param removalAmounts The removal amounts per each removal ID.
   * @param data The bytes that either encode information about the new certificate to be minted (as a CertificateData
   * struct) or a boolean indicating whether this is a batch of removals being sent to replace released removals.
   * @return The selector of the function.
   */
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] calldata removalIds,
    uint256[] calldata removalAmounts,
    bytes calldata data
  ) external returns (bytes4) {
    require(
      _msgSender() == address(_removal),
      "Certificate: Sender not removal contract"
    );
    bool isReplacement = abi.decode(data, (bool));
    if (isReplacement) {
      uint256 replacementAmount = removalAmounts.sum();
      _nrtDeficit -= replacementAmount;
    } else {
      CertificateData memory certificateData = abi.decode(
        data,
        (CertificateData)
      );
      _receiveRemovalBatch({
        recipient: certificateData.recipient,
        certificateAmount: certificateData.certificateAmount,
        removalIds: removalIds,
        removalAmounts: removalAmounts,
        purchasingTokenAddress: certificateData.purchasingTokenAddress,
        priceMultiple: certificateData.priceMultiple,
        noriFeePercentage: certificateData.noriFeePercentage
      });
    }
    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @notice Returns the address of the Removal contract.
   * @return The address of the Removal contract.
   */
  function getRemovalAddress() external view returns (address) {
    return address(_removal);
  }

  function totalMinted() external view override returns (uint256) {
    return _totalMinted();
  }

  /**
   * @notice Returns the nrt deficit, which is the difference between the total number of NRTs
   * guaranteed by this contract (purchased) and the current number of NRTs actually held.
   */
  function getNrtDeficit() external view returns (uint256) {
    return _nrtDeficit;
  }

  /**
   * @notice Returns the number of tonnes of carbon removals purchased.
   * @param certificateId The certificate for which to retrieve the original amount.
   * @return The tonnes of carbon removal purchased for the certificate.
   */
  function getPurchaseAmount(uint256 certificateId)
    external
    view
    returns (uint256)
  {
    return _purchaseAmounts[certificateId];
  }

  /**
   * @dev See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   * @param interfaceId The interface ID to check for support.
   * @return True if the interface is supported, false otherwise.
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
    return
      super.supportsInterface({interfaceId: interfaceId}) ||
      interfaceId == 0x80ac58cd || // interface ID for ERC721
      interfaceId == 0x5b5e139f; // interface ID for ERC721Metadata
  }

  /**
   * @notice This function is unsupported and will always revert.
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
   * @notice This function is unsupported and will always revert.
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
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks).
   *
   * ##### Requirements:
   *
   * - This contract must not be paused.
   * - Can only be used when the caller has the `CERTIFICATE_OPERATOR_ROLE` role.
   * @param from The address of the sender.
   * @param to The address of the recipient.
   * @param startTokenId The ID of the first certificate in the transfer.
   * @param quantity The number of certificates in the transfer.
   */
  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal virtual override whenNotPaused {
    bool isNotMinting = !(from == address(0));
    bool isNotBurning = !(to == address(0));
    bool isMissingOperatorRole = !hasRole({
      role: CERTIFICATE_OPERATOR_ROLE,
      account: _msgSender()
    });
    if (isNotMinting && isNotBurning && isMissingOperatorRole) {
      revert ForbiddenTransferAfterMinting();
    }
    super._beforeTokenTransfers({
      from: from,
      to: to,
      startTokenId: startTokenId,
      quantity: quantity
    });
  }

  /**
   * @notice Creates a new certificate for a batch of removals.
   * @dev Mints a new certificate token to the next sequential ID and updates the internal data structures
   * that track the relationship between the certificate and its constituent removal tokens and balances.
   *
   * Emits a `ReceiveRemovalBatch` event.
   * @param recipient The address receiving the new certificate.
   * @param certificateAmount The total number of tonnes of carbon removals represented by the new certificate.
   * @param removalIds The Removal token IDs that are being included in the certificate.
   * @param removalAmounts The balances of each corresponding removal token that are being included in the certificate.
   * @param purchasingTokenAddress The address of the token used to purchase the certificate.
   * @param priceMultiple The number of purchasing tokens required to purchase one NRT.
   * @param noriFeePercentage The fee percentage charged by Nori at the time of this purchase.
   */
  function _receiveRemovalBatch(
    address recipient,
    uint256 certificateAmount,
    uint256[] calldata removalIds,
    uint256[] calldata removalAmounts,
    address purchasingTokenAddress,
    uint256 priceMultiple,
    uint256 noriFeePercentage
  ) internal {
    _validateReceivedRemovalBatch({
      removalIds: removalIds,
      removalAmounts: removalAmounts,
      certificateAmount: certificateAmount
    });
    uint256 certificateId = _nextTokenId();
    _purchaseAmounts[certificateId] = certificateAmount;
    _mint(recipient, 1);
    emit ReceiveRemovalBatch({
      from: _msgSender(),
      recipient: recipient,
      certificateId: certificateId,
      certificateAmount: certificateAmount,
      removalIds: removalIds,
      removalAmounts: removalAmounts,
      purchasingTokenAddress: purchasingTokenAddress,
      priceMultiple: priceMultiple,
      noriFeePercentage: noriFeePercentage
    });
  }

  /**
   * @notice Returns the sender of the transaction.
   * @dev In all cases currently, we expect that the `_msgSender()`, `_msgSenderERC721A()` and `msg.sender` all return
   * the same value. As such, this function exists solely for compatibility with OpenZeppelin and ERC721A
   * contracts. For more, see [here](https://github.com/chiru-labs/ERC721A/pull/281) and [here](
   * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol).
   * @return For regular transactions it returns `msg.sender` and for meta transactions it *can* be used to return the
   * end-user (rather than the relayer).
   */
  function _msgSenderERC721A() internal view override returns (address) {
    return _msgSender();
  }

  /**
   * @notice The baseUri for the certificate token.
   * @dev Base URI for computing `tokenURI`. If set, the resulting URI for each token will be the concatenation of the
   * `baseURI` and the `tokenId`. Empty by default, it can be overridden in child contracts.
   * @return The base URI for the certificate.
   */
  function _baseURI() internal view override returns (string memory) {
    return _baseURIValue;
  }

  /**
   * @notice Validates the incoming batch of removal token data by comparing the lengths of IDs and amounts.
   * @dev Reverts if the array lengths do not match.
   * @param removalIds Array of removal IDs.
   * @param removalAmounts Array of removal amounts.
   * @param certificateAmount The total number of tonnes of carbon removals represented by the new certificate.
   */
  function _validateReceivedRemovalBatch(
    uint256[] calldata removalIds,
    uint256[] calldata removalAmounts,
    uint256 certificateAmount
  ) internal pure {
    if (removalAmounts.sum() != certificateAmount) {
      revert("Incorrect supply allocation");
    }
    if (removalIds.length != removalAmounts.length) {
      revert ArrayLengthMismatch({
        array1Name: "removalIds",
        array2Name: "removalAmounts"
      });
    }
  }
}
