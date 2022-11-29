// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "./AccessPresetPausable.sol";
import "./Errors.sol";
import "./IMarket.sol";
import "./ICertificate.sol";
import "./IRemoval.sol";
import "./IRestrictedNORI.sol";
import {RemovalIdLib, DecodedRemovalIdV0} from "./RemovalIdLib.sol";

/**
 * @title An extended ERC1155 token contract for carbon removal accounting.
 * @author Nori Inc.
 * @notice This contract uses ERC1155 tokens as an accounting system for keeping track of carbon that Nori has
 * verified to have been removed from the atmosphere. Each token ID encodes information about the source of the
 * removed carbon (see the [RemovalIdLib docs](../docs/RemovalIdLib.md) for encoding details), and each token represents
 * the smallest unit of carbon removal accounting.  For example, in an agricultural methodology, a specific token ID
 * represents one parcel of land in a specific year.  The total supply of that token ID is the number of tonnes of
 * carbon removed.
 *
 * ##### Additional behaviors and features:
 *
 * ###### Minting
 * - Only accounts with the CONSIGNOR_ROLE can mint removal tokens, which should only be account(s) controlled by Nori.
 * - When removal tokens are minted, additional data about those removals are stored in a mapping keyed by the token ID,
 * such as a project ID and a holdback percentage (which determines the percentage of the sale proceeds from the token
 * that will be routed to the RestrictedNORI contract). A restriction schedule is created per `projectId` (if necessary)
 * in RestrictedNORI (see the [RestrictedNORI docs](../docs/RestrictedNORI.md)).
 * - Minting reverts when attempting to mint a token ID that already exists.
 * - The function `addBalance` can be used to mint additional balance to a token ID that already exists.
 *
 *
 * ###### Listing
 * - _Listing_ refers to the process of listing removal tokens for sale in Nori's marketplace (the Market contract).
 * - Removals are listed for sale by transferring ownership of the tokens to the Market contract via
 * `consign`. Alternatively, If the `to` argument to `mintBatch` is the address of the Market contract,
 * removal tokens will be listed in the same transaction that they are minted.
 * - Only accounts with the CONSIGNOR_ROLE can list removals for sale in the market.
 *
 *
 * ###### Releasing
 * - _Releasing_ refers to the process of accounting for carbon that has failed to meet its permanence guarantee
 * and has been released into the atmosphere prematurely.
 * - This accounting is performed by burning the affected balance of a removal that has been released.
 * - Only accounts with the RELEASER_ROLE can initiate a release.
 * - When a removal token is released, balances are burned in a specific order until the released amount
 * has been accounted for: Releasing burns first from unlisted balances, second from listed balances and third from the
 * certificate contract (see `Removal.release` for more).
 * - Affected certificates will have any released balances replaced by new removals purchased by Nori, though an
 * automated implementation of this process is beyond the scope of this version of the contracts.
 *
 *
 * ###### Token ID encoding and decoding
 * - This contract uses the inlined library RemovalIdLib for uint256.
 * - When minting tokens, an array of structs containing information about each removal is passed as an argument to
 * `mintBatch` and that data is used to generate the encoded token IDs for each removal.
 * - `decodeRemovalIdV0` is exposed externally for encoding and decoding Removal token IDs that contain uniquely
 * identifying information about the removal. See the [RemovalIdLib docs](../docs/RemovalIdLib.md) for encoding details.
 *
 * ###### Additional behaviors and features
 *
 * - [ERC-1155 functionality](https://eips.ethereum.org/EIPS/eip-1155)
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
 * pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 * - `CONSIGNOR_ROLE`: Can mint removal tokens and list them for sale in the Market contract.
 * - `RELEASER_ROLE`: Can release partial or full removal balances.
 * - `PAUSER_ROLE`: Can pause and unpause the contract.
 * - `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles.
 *
 * ##### Inherits:
 *
 * - [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc11555)
 * - [ERC1155Supply](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Supply)
 * - [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements:
 *
 * - [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
 * - [IERC1155MetadataURI](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155MetadataURI)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses:
 *
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet) for
 * `EnumerableSetUpgradeable.UintSet`
 */
contract Removal is
  IRemoval,
  ERC1155SupplyUpgradeable,
  AccessPresetPausable,
  MulticallUpgradeable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  /**
   * @notice Role conferring the ability to mint removals as well as the ability to list minted removals that have yet
   * to be listed for sale.
   */
  bytes32 public constant CONSIGNOR_ROLE = keccak256("CONSIGNOR_ROLE");

  /**
   * @notice Role conferring the ability to mark a removal as released.
   */
  bytes32 public constant RELEASER_ROLE = keccak256("RELEASER_ROLE");

  /**
   * @notice The Market contract that removals can be bought and sold from.
   */
  IMarket internal _market;

  /**
   * @notice The Certificate contract that removals are retired into.
   */
  ICertificate private _certificate;

  /**
   * @dev Maps from a given project ID to the holdback percentage that will be used to determine what percentage of
   * proceeds are routed to the RestrictedNORI contract when removals from this project are sold.
   */
  mapping(uint256 => uint8) private _projectIdToHoldbackPercentage;

  /**
   * @dev Maps from a removal ID to the project ID it belongs to.
   */
  mapping(uint256 => uint256) private _removalIdToProjectId;

  /**
   * @notice Maps from an address to an EnumerableSet of the token IDs for which that address has a non-zero balance.
   */
  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToOwnedTokenIds;

  /**
   * @notice The current balance of across all removals listed in the market contract.
   */
  uint256 private _currentMarketBalance;

  /**
   * @notice Emitted on updating the addresses for contracts.
   * @param market The address of the new market contract.
   * @param certificate The address of the new certificate contract.
   */
  event ContractAddressesRegistered(IMarket market, ICertificate certificate);

  /**
   * @notice Emitted when the holdback percentage is updated for a project.
   * @param projectId The ID of the project.
   * @param holdbackPercentage The new holdback percentage for the project.
   */
  event SetHoldbackPercentage(uint256 projectId, uint8 holdbackPercentage);

  /**
   * @notice Emitted on releasing a removal from a supplier, the market, or a certificate.
   * @param id The id of the removal that was released.
   * @param fromAddress The address the removal was released from.
   * @param amount The amount that was released.
   */
  event RemovalReleased(
    uint256 indexed id,
    address indexed fromAddress,
    uint256 amount
  );

  /**
   * @notice Emitted when legacy removals are minted and then immediately used to migrate a legacy certificate.
   * @param certificateRecipient The recipient of the certificate to mint via migration.
   * @param certificateAmount The total amount of the certificate to mint via migration (denominated in NRTs).
   * @param certificateId The ID of the certificate to mint via migration.
   * @param removalIds The removal IDs to use to mint the certificate via migration.
   * @param removalAmounts The amounts for each corresponding removal ID to use to mint the certificate via migration.
   */
  event Migrate(
    address indexed certificateRecipient,
    uint256 indexed certificateAmount,
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] removalAmounts
  );

  /**
   * @notice Locks the contract, preventing any future re-initialization.
   * @dev See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the Removal contract.
   * @param baseURI The base URI for the removal NFTs.
   */
  function initialize(string memory baseURI) external initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __ERC1155_init_unchained({uri_: string(abi.encodePacked(baseURI, "{id}"))});
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Multicall_init_unchained();
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    _grantRole({role: PAUSER_ROLE, account: _msgSender()});
    _grantRole({role: CONSIGNOR_ROLE, account: _msgSender()});
    _grantRole({role: RELEASER_ROLE, account: _msgSender()});
  }

  /**
   * @notice Registers the market and certificate contracts so that they can be referenced in this contract.
   * Called as part of the market contract system deployment process.
   * @dev Emits a `ContractAddressesRegistered` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param market The address of the Market contract.
   * @param certificate The address of the Certificate contract.
   */
  function registerContractAddresses(IMarket market, ICertificate certificate)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _market = market;
    _certificate = certificate;
    emit ContractAddressesRegistered({
      market: market,
      certificate: certificate
    });
  }

  /**
   * @notice Update the holdback percentage value for a project.
   * @dev Emits a `SetHoldbackPercentage` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param projectId The id of the project for which to update the holdback percentage.
   * @param holdbackPercentage The new holdback percentage.
   */
  function setHoldbackPercentage(uint256 projectId, uint8 holdbackPercentage)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _setHoldbackPercentage({
      projectId: projectId,
      holdbackPercentage: holdbackPercentage
    });
  }

  /**
   * @notice Update the holdback percentage value for a project.
   * @dev Emits a `SetHoldbackPercentage` event.
   *
   * ##### Requirements:
   *
   * @param projectId The id of the project for which to update the holdback percentage.
   * @param holdbackPercentage The new holdback percentage.
   */
  function _setHoldbackPercentage(uint256 projectId, uint8 holdbackPercentage)
    internal
  {
    if (holdbackPercentage > 100) {
      revert InvalidHoldbackPercentage({
        holdbackPercentage: holdbackPercentage
      });
    }
    _projectIdToHoldbackPercentage[projectId] = holdbackPercentage;
    emit SetHoldbackPercentage({
      projectId: projectId,
      holdbackPercentage: holdbackPercentage
    });
  }

  /**
   * @notice Mints multiple removals at once (for a single supplier).
   * @dev If `to` is the market address, the removals are listed for sale in the market.
   *
   * ##### Requirements:
   * - Can only be used when the caller has the `CONSIGNOR_ROLE`
   * - Enforces the rules of `Removal._beforeTokenTransfer`
   * - Can only be used when this contract is not paused
   * - Cannot mint to a removal ID that already exists (use `addBalance` instead).
   * @param to The recipient of this batch of removals. Should be the supplier's address or the market address.
   * @param amounts Each removal's tonnes of CO2 formatted.
   * @param removals The removals to mint (represented as an array of `DecodedRemovalIdV0`). These removals are used
   * to encode the removal IDs.
   * @param projectId The project ID for this batch of removals.
   * @param scheduleStartTime The start time of the schedule for this batch of removals.
   * @param holdbackPercentage The holdback percentage for this batch of removals.
   */
  function mintBatch(
    address to,
    uint256[] calldata amounts,
    DecodedRemovalIdV0[] calldata removals,
    uint256 projectId,
    uint256 scheduleStartTime,
    uint8 holdbackPercentage
  ) external onlyRole(CONSIGNOR_ROLE) {
    uint256[] memory ids = _createRemovals({
      removals: removals,
      projectId: projectId
    });
    _setHoldbackPercentage({
      projectId: projectId,
      holdbackPercentage: holdbackPercentage
    });
    _mintBatch({to: to, ids: ids, amounts: amounts, data: ""});
    IRestrictedNORI _restrictedNORI = IRestrictedNORI(
      _market.restrictedNoriAddress()
    );
    if (!_restrictedNORI.scheduleExists({scheduleId: projectId})) {
      _restrictedNORI.createSchedule({
        projectId: projectId,
        startTime: scheduleStartTime,
        methodology: removals[0].methodology,
        methodologyVersion: removals[0].methodologyVersion
      });
    }
  }

  /**
   * @notice Mints additional balance for multiple removals at once.
   * @dev If `to` is the market address, the removals are listed for sale in the market.
   *
   * ##### Requirements:
   * - Can only be used when the caller has the `CONSIGNOR_ROLE` role.
   * - Can only be used when this contract is not paused.
   * - IDs must already have been minted via `mintBatch`.
   * - Enforces the rules of `Removal._beforeTokenTransfer`.
   * @param to The supplier address or market address.
   * @param amounts Each removal's additional tonnes of CO2 formatted.
   * @param ids The removal IDs to add balance for.
   */
  function addBalance(
    address to,
    uint256[] calldata amounts,
    uint256[] calldata ids
  ) external onlyRole(CONSIGNOR_ROLE) {
    for (uint256 i = 0; i < ids.length; ++i) {
      if (_removalIdToProjectId[ids[i]] == 0) {
        revert RemovalNotYetMinted({tokenId: ids[i]});
      }
    }
    _mintBatch({to: to, ids: ids, amounts: amounts, data: ""});
  }

  /**
   * @notice Lists the provided `amount` of the specified removal `id` for sale in Nori's marketplace.
   * @dev The Market contract implements `onERC1155Received`, which is invoked upon receipt of any tokens from
   * this contract, and handles the mechanics of listing this token for sale.
   * @param from The current owner of the specified token ID and amount
   * @param id The token ID of the removal token being listed for sale
   * @param amount The balance of this token ID to transfer to the Market contract
   */
  function consign(
    address from,
    uint256 id,
    uint256 amount
  ) external onlyRole(CONSIGNOR_ROLE) {
    if (from == address(_certificate) || from == address(_market)) {
      revert RemovalAlreadySoldOrConsigned({tokenId: id});
    }
    _safeTransferFrom({
      from: from,
      to: address(_market),
      id: id,
      amount: amount,
      data: ""
    });
  }

  /**
   * @notice Transfers the provided `amounts` (denominated in NRTs) of the specified removal `ids` directly to the
   * Certificate contract to mint a legacy certificate. This function provides Nori the ability to execute a one-off
   * migration of legacy certificates and removals (legacy certificates and removals are those which existed prior to
   * our deployment to Polygon and covers all historic issuances and purchases up until the date that we start using the
   * Market contract).
   * @dev The Certificate contract implements `onERC1155BatchReceived`, which is invoked upon receipt of a batch of
   * removals (triggered via `_safeBatchTransferFrom`). This function circumvents the market contract's lifecycle by
   * transferring the removals from an account with the `CONSIGNOR_ROLE` role.
   *
   * It is necessary that the consignor holds the removals because of the following:
   * - `ids` can be composed of a list of removal IDs that belong to one or more suppliers.
   * - `_safeBatchTransferFrom` only accepts one `from` address.
   * - `Certificate.onERC1155BatchReceived` will mint a *new* certificate every time an additional batch is received, so
   * we must ensure that all the removals comprising the certificate to be migrated come from a single batch.
   *
   * ##### Requirements:
   * - The caller must have the `CONSIGNOR_ROLE` role.
   * - The contract must not be paused.
   * - The specified removal IDs must exist (e.g., via a prior call to the `mintBatch` function).
   * - The rules of `Removal._beforeTokenTransfer` are enforced.
   * @param ids An array of the removal IDs to add to transfer to the Certificate contract. This array can contain IDs
   * of removals that belong to one or more supplier address (designated in the encoding of the removal ID).
   * @param amounts An array of the removal amounts to add to transfer to the Certificate contract. Each amount in this
   * array corresponds to the removal ID with the same index in the `ids` parameter.
   * @param certificateRecipient The recipient of the certificate to be minted.
   * @param certificateAmount The total amount of the certificate.
   */
  function migrate(
    uint256[] calldata ids,
    uint256[] calldata amounts,
    address certificateRecipient,
    uint256 certificateAmount
  ) external onlyRole(CONSIGNOR_ROLE) {
    emit Migrate({
      certificateRecipient: certificateRecipient,
      certificateAmount: certificateAmount,
      certificateId: _certificate.totalMinted(),
      removalIds: ids,
      removalAmounts: amounts
    });
    _safeBatchTransferFrom({
      from: _msgSender(),
      to: address(_certificate),
      ids: ids,
      amounts: amounts,
      data: abi.encode(certificateRecipient, certificateAmount, address(0), 0)
    });
  }

  /**
   * @notice Accounts for carbon that has failed to meet its permanence guarantee and has been released into
   * the atmosphere prematurely.
   * @dev Releases `amount` of removal `id` by burning it. The replacement of released removals that had
   * already been included in certificates is beyond the scope of this version of the contracts.
   *
   * ##### Requirements:
   *
   * - Releasing burns first from unlisted balances, second from listed balances and third from certificates.
   * - If there is unlisted balance for this removal (e.g., owned by the supplier address encoded in the token ID),
   * that balance is burned up to `amount`.
   * - If the released amount has not yet been fully burned and the removal is listed, it is delisted from the market
   * and up to any remaining released amount is burned from the Market's balance.
   * - Finally, if the released amount is still not fully accounted for, the removal must be owned by one or more
   * certificates. The remaining released amount is burned from the Certificate contract's balance.
   * - The caller must have the `RELEASER_ROLE`.
   * - The rules of `_burn` are enforced.
   * - Can only be used when the contract is not paused.
   * @param id The ID of the removal to release some amount of.
   * @param amount The amount of the removal to release.
   */
  function release(uint256 id, uint256 amount)
    external
    onlyRole(RELEASER_ROLE)
  {
    uint256 amountReleased = 0;
    uint256 unlistedBalance = balanceOf({
      account: RemovalIdLib.supplierAddress(id),
      id: id
    });
    if (unlistedBalance > 0) {
      uint256 amountToRelease = MathUpgradeable.min({
        a: amount,
        b: unlistedBalance
      });
      _releaseFromSupplier({id: id, amount: amountToRelease});
      amountReleased += amountToRelease;
    }
    if (amountReleased < amount) {
      uint256 listedBalance = balanceOf({
        account: this.marketAddress(),
        id: id
      });
      if (listedBalance > 0) {
        uint256 amountToRelease = MathUpgradeable.min({
          a: amount - amountReleased,
          b: listedBalance
        });
        _releaseFromMarket({amount: amountToRelease, id: id});
        amountReleased += amountToRelease;
      }
      if (amountReleased < amount) {
        if (balanceOf({account: this.certificateAddress(), id: id}) > 0) {
          uint256 amountToRelease = amount - amountReleased;
          _releaseFromCertificate({id: id, amount: amount - amountReleased});
          amountReleased += amountToRelease;
        }
      }
    }
  }

  /**
   * @notice Get the address of the Market contract.
   * @return The address of the Market contract.
   */
  function marketAddress() external view returns (address) {
    return address(_market);
  }

  /**
   * @notice Get the address of the Certificate contract.
   * @return The address of the Certificate contract.
   */
  function certificateAddress() external view returns (address) {
    return address(_certificate);
  }

  /**
   * @notice Get the project ID (which is the removal's schedule ID in RestrictedNORI) for a given removal ID.
   * @param id The removal token ID for which to retrieve the project ID.
   * @return The project ID for the removal token ID.
   */
  function getProjectId(uint256 id) external view override returns (uint256) {
    return _removalIdToProjectId[id];
  }

  /**
   * @notice Gets the holdback percentage for a removal.
   * @param id The removal token ID for which to retrieve the holdback percentage.
   * @return The holdback percentage for the removal token ID.
   */
  function getHoldbackPercentage(uint256 id) external view returns (uint8) {
    return _projectIdToHoldbackPercentage[_removalIdToProjectId[id]];
  }

  /**
   * @notice The current total balance of all removal tokens owned by the Market contract.
   * This sum is maintained as a running total for efficient lookup during purchases.
   * @return The total balance of all removal tokens owned by the Market contract.
   */
  function getMarketBalance() external view returns (uint256) {
    return _currentMarketBalance;
  }

  /**
   * @notice Returns an array of all token IDs currently owned by `owner`.
   * @param owner The account for which to retrieve owned token IDs.
   * @return An array of all Removal token IDs currently owned by `owner`.
   */
  function getOwnedTokenIds(address owner)
    external
    view
    returns (uint256[] memory)
  {
    return _addressToOwnedTokenIds[owner].values();
  }

  /**
   * @notice The number of unique token IDs owned by the given `account`.
   * Maintained for efficient lookup of the number of distinct removal tokens owned by the Market.
   * @param account The account for which to retrieve the unique number of token IDs owned.
   * @return The number of unique Removal token IDs owned by the given `account`.
   */
  function numberOfTokensOwnedByAddress(address account)
    external
    view
    returns (uint256)
  {
    return _addressToOwnedTokenIds[account].length();
  }

  /**
   * @notice Decodes a V0 removal ID into its component data.
   * @param id The removal ID to decode.
   * @return The decoded removal ID data.
   */
  function decodeRemovalIdV0(uint256 id)
    external
    pure
    returns (DecodedRemovalIdV0 memory)
  {
    return RemovalIdLib.decodeRemovalIdV0({removalId: id});
  }

  /**
   * @notice Transfers `amount` tokens of token type `id` from `from` to `to`.
   * @dev Calls `ERC1155Upgradeable.safeTransferFrom`
   *
   * Emits a `TransferSingle` event.
   *
   * ##### Requirements:
   *
   * - Can only be called by the Market contract.
   * - `to` cannot be the zero address.
   * - If the caller is not `from`, it must have been approved to spend ``from``'s tokens via `setApprovalForAll`.
   * - `from` must have a balance of tokens of type `id` of at least `amount`.
   * - If `to` refers to a smart contract, it must implement `IERC1155Receiver.onERC1155Received` and return the
   * acceptance magic value.
   * @param from The address to transfer from.
   * @param to The address to transfer to.
   * @param id The removal ID to transfer.
   * @param amount The amount of removals to transfer.
   * @param data The data to pass to the receiver contract.
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public override {
    if (_msgSender() != address(_market)) {
      revert ForbiddenTransfer();
    }
    super.safeTransferFrom({
      from: from,
      to: to,
      id: id,
      amount: amount,
      data: data
    });
  }

  /**
   * @notice Batched version of `safeTransferFrom`.
   * @dev Emits a `TransferBatch` event.
   *
   * ##### Requirements:
   *
   * - Can only be called by the Market contract.
   * - `ids` and `amounts` must have the same length.
   * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
   * acceptance magic value.
   * @param from The address to transfer from.
   * @param to The address to transfer to.
   * @param ids The removal IDs to transfer.
   * @param amounts The amounts of removals to transfer.
   * @param data The data to pass to the receiver contract.
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override {
    if (_msgSender() != address(_market)) {
      revert ForbiddenTransfer();
    }
    super.safeBatchTransferFrom({
      from: from,
      to: to,
      ids: ids,
      amounts: amounts,
      data: data
    });
  }

  /**
   * @notice Grants or revokes permission to `operator` to transfer the caller's tokens, according to `approved`.
   * @dev Emits an `ApprovalForAll` event.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - `operator` cannot be the caller.
   * @param operator The address to grant or revoke approval from.
   * @param approved Whether or not the `operator` is approved to transfer the caller's tokens.
   */
  function setApprovalForAll(address operator, bool approved)
    public
    override
    whenNotPaused
  {
    _setApprovalForAll({
      owner: _msgSender(),
      operator: operator,
      approved: approved
    });
  }

  /**
   * @notice Returns true if this contract implements the interface defined by
   * `interfaceId`.
   * @dev See the corresponding [EIP section](https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified) to
   * learn more about how these ids are created.
   * See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   * This function call must use less than 30,000 gas.
   * @param interfaceId A bytes4 value which represents an interface ID.
   * @return True if this contract implements the interface defined by `interfaceId`, otherwise false.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface({interfaceId: interfaceId});
  }

  /**
   * @notice Called during `mintBatch`, creates the removal IDs from the removal data, validates
   * the new IDs to prevent minting a pre-existing ID, stores the project ID in a mapping.
   * @param removals An array of `DecodedRemovalIdV0` structs containing data about each removal
   * @param projectId The project IDentifier for this batch of removals.
   * @return An array of removal IDs that were created.
   */
  function _createRemovals(
    DecodedRemovalIdV0[] calldata removals,
    uint256 projectId
  ) internal returns (uint256[] memory) {
    uint256[] memory ids = new uint256[](removals.length);
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < removals.length; ++i) {
        uint256 id = RemovalIdLib.createRemovalId({removal: removals[i]});
        _createRemoval({id: id, projectId: projectId});
        ids[i] = id;
      }
    }
    return ids;
  }

  /**
   * @notice Called by `_createRemovals`, validates the new IDs to prevent minting a pre-existing ID,
   * stores the project ID in a mapping.
   * @param id The removal ID being minted.
   * @param projectId The project ID for this removal.
   */
  function _createRemoval(uint256 id, uint256 projectId) internal {
    _validateRemoval({id: id});
    _removalIdToProjectId[id] = projectId;
  }

  /**
   * @notice Burns `amount` of token ID `id` from the supplier address encoded in the ID.
   * @dev Emits a `RemovalReleased` event.
   * @param id The token ID to burn.
   * @param amount The amount to burn.
   */
  function _releaseFromSupplier(uint256 id, uint256 amount) internal {
    address supplierAddress = RemovalIdLib.supplierAddress({removalId: id});
    super._burn({from: supplierAddress, id: id, amount: amount});
    emit RemovalReleased({
      id: id,
      fromAddress: supplierAddress,
      amount: amount
    });
  }

  /**
   * @notice Burns `amount` of token ID `id` from the Market's balance.
   * @dev Emits a `RemovalReleased` event.
   * @param id The token ID to burn.
   * @param amount The amount to burn.
   */
  function _releaseFromMarket(uint256 id, uint256 amount) internal {
    super._burn({from: this.marketAddress(), id: id, amount: amount});
    _market.release(id, amount);
    emit RemovalReleased({
      id: id,
      fromAddress: this.marketAddress(),
      amount: amount
    });
  }

  /**
   * @notice Burns `amount` of token ID `id` from the Certificate's balance.
   * @dev Emits a `RemovalReleased` event.
   * @param id The removal ID to burn.
   * @param amount The amount to burn.
   */
  function _releaseFromCertificate(uint256 id, uint256 amount) internal {
    address certificateAddress_ = this.certificateAddress();
    super._burn({from: certificateAddress_, id: id, amount: amount});
    emit RemovalReleased({
      id: id,
      fromAddress: certificateAddress_,
      amount: amount
    });
  }

  /**
   * @notice Hook that is called before any token transfer. This includes minting and burning, as well as
   * batched variants. Disables transfers to any address that is not the Market or Certificate contracts, the zero
   * address (for burning), the supplier address that is encoded in the token ID itself, or between consignors.
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - Enforces the rules of `ERC1155Upgradeable._beforeTokenTransfer`.
   * - Enforces the rules of `ERC1155SupplyUpgradeable._beforeTokenTransfer`.
   * @param operator The address to transfer from.
   * @param from The address to transfer from.
   * @param to The address to transfer to.
   * @param ids The removal IDs to transfer.
   * @param amounts The amounts of removals to transfer.
   * @param data The data to pass to the receiver contract.
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override whenNotPaused {
    address market = address(_market);
    address certificate = address(_certificate);
    bool isValidTransfer = to == market ||
      to == certificate ||
      to == address(0) ||
      (hasRole({role: CONSIGNOR_ROLE, account: _msgSender()}) &&
        (to == certificate || hasRole({role: CONSIGNOR_ROLE, account: to})));
    uint256 countOfRemovals = ids.length;
    for (uint256 i = 0; i < countOfRemovals; ++i) {
      uint256 id = ids[i];
      if (to == market) {
        if (amounts[i] == 0) {
          revert InvalidTokenTransfer({tokenId: id});
        }
        _currentMarketBalance += amounts[i];
      }
      if (from == market) {
        _currentMarketBalance -= amounts[i];
      }
      if (
        !isValidTransfer && to != RemovalIdLib.supplierAddress({removalId: id})
      ) {
        revert ForbiddenTransfer();
      }
    }
    super._beforeTokenTransfer({
      operator: operator,
      from: from,
      to: to,
      ids: ids,
      amounts: amounts,
      data: data
    });
  }

  /**
   * @notice Hook that is called after any token transfer. This includes minting and burning, as well as batched
   * variants.
   * @dev Updates the mapping from address to set of owned token IDs.
   *
   * The same hook is called on both single and batched variants. For single transfers, the length of the `id` and
   * `amount` arrays will be 1.
   *
   * ##### Requirements
   *
   * - When `from` and `to` are both non-zero, `amount`s of `from`'s tokens with IDs `id`s will be transferred to `to`.
   * - When `from` is zero, `amount`s tokens of token type `id` will be minted for `to`.
   * - When `to` is zero, `amount`s of `from`'s tokens with IDs `id`s will be burned.
   * - `from` and `to` are never both zero.
   * - `ids` and `amounts` have the same, non-zero length.
   * @param operator The address to transfer from.
   * @param from The address to transfer from.
   * @param to The address to transfer to.
   * @param ids The removal IDs to transfer.
   * @param amounts The amounts of removals to transfer.
   * @param data The data to pass to the receiver contract.
   */
  function _afterTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override {
    _updateOwnedTokenIds({from: from, to: to, ids: ids});
    super._afterTokenTransfer({
      operator: operator,
      from: from,
      to: to,
      ids: ids,
      amounts: amounts,
      data: data
    });
  }

  /**
   * @notice Updates the mapping from address to set of owned token IDs.
   * @dev Called during `_afterTokenTransfer`.
   * @param from The address from which tokens were transferred.
   * @param to The address to which tokens were transferred.
   * @param ids The token IDs that were transferred.
   */
  function _updateOwnedTokenIds(
    address from,
    address to,
    uint256[] memory ids
  ) internal {
    EnumerableSetUpgradeable.UintSet
      storage receiversOwnedRemovalIds = _addressToOwnedTokenIds[to];
    EnumerableSetUpgradeable.UintSet
      storage sendersOwnedRemovalIds = _addressToOwnedTokenIds[from];
    uint256 countOfRemovals = ids.length;
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < countOfRemovals; ++i) {
        uint256 id = ids[i];
        if (from != address(0)) {
          if (balanceOf({account: from, id: id}) == 0) {
            sendersOwnedRemovalIds.remove({value: id});
          }
        }
        if (to != address(0)) {
          receiversOwnedRemovalIds.add({value: id});
        }
      }
    }
  }

  /**
   * @notice Validates that the provided `id` should be minted.
   * @dev Reverts if a project ID has already been set for `id`.
   * @param id The ID to validate.
   */
  function _validateRemoval(uint256 id) internal view {
    if (_removalIdToProjectId[id] != 0) {
      revert InvalidData();
    }
  }
}
