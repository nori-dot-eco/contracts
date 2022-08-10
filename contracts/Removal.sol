// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "./Market.sol";
import {RemovalIdLib, UnpackedRemovalIdV0} from "./RemovalIdLib.sol";
import {InvalidCall, InvalidData, InvalidTokenTransfer, ForbiddenTransfer} from "./Errors.sol";

/**
 * @title An extended ERC1155 token contract for carbon removal accounting.
 *
 * @author Nori Inc.
 *
 * @notice This contract uses ERC1155 tokens as an accounting system for keeping track of carbon that Nori has
 * verified to have been removed from the atmosphere. Each token ID encodes information about the source of the
 * removed carbon (see RemovalIdLib.sol for encoding details), and each token represents the smallest unit of
 * carbon removal accounting.  For example, in an agricultural methodology, a specific token ID represents one
 * parcel of land in a specific year.  The total supply of that token ID is the number of tonnes of carbon
 * removed.
 *
 * ##### Behaviors and features
 *
 * ##### Minting
 * - Only accounts with the MINTER_ROLE can mint removal tokens, which should only be account(s) controlled by Nori.
 * - When removal tokens are minted, additional data about those removals are stored in a mapping, such as a projectId
 * and a holdback percentage (which determines the percentage of the sale proceeds from the token that will be routed
 * to the RestrictedNORI contract). A restriction schedule is created per projectId (if necessary) in RestrictedNORI
 * (see RestrictedNORI.sol)
 * - Minting reverts when attempting to mint a token ID that already exists. Therefore the current iteration of this
 * contract has no way to add balance to an existing token ID.
 *
 *
 * ##### Listing
 * - _Listing_ refers to the process of listing removal tokens for sale in Nori's marketplace (Market.sol)
 * - Removals are listed for sale by transferring ownership of the tokens to the Market contract via
 * `safeBatchTransferFrom`. If the `list` field of the `data` parameter in `mintBatch` is set to true,
 * removal tokens will be listed in the same transaction that they are minted.
 * - Only accounts with the MINTER_ROLE can list removals for sale in the market.
 *
 *
 * ##### Releasing
 * - _Releasing_ refers to the process of accounting for carbon that has failed to meet its permanence guarantee
 * and has been released into the atmosphere prematurely.
 * - This accounting is performed by burning the affected balance of a removal that has been released.
 * - Only accounts with the RELEASER_ROLE can initiate a release.
 * - When a removal token is released, balances are burned in a specific order until the released amount
 * has been accounted for: Releasing burns first from unlisted balances, second from listed balances and third
 * from any certificates in which this removal may have already been included. (see `Removal.release`)
 * - Affected certificates will have any released balances replaced by new removals purchased by Nori, though an
 * automated implementation of this process is beyond the scope of this version of the contracts.
 *
 *
 * ##### Token ID encoding and decoding
 * - This contract uses the inlined library RemovalIdLib.sol for uint256.
 * - `createRemovalId` and `unpackRemovalIdV0` are exposed externally for encoding and decoding removal token IDs
 * that contain uniquely identifying information about the removal. See RemovalIdLib.sol for encoding details.
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 *   - all functions that mutate state are pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - CONSIGNOR_ROLE
 *      - Can mint removal tokens and list them for sale in the Market contract
 *    - RELEASER_ROLE
 *      - Can release partial or full removal balances
 *    - PAUSER_ROLE
 *      - Can pause and unpause the contract
 *    - DEFAULT_ADMIN_ROLE
 *      - This is the only role that can add/revoke other accounts to any of the roles
 * - [Limited ERC-1155 functionality](https://eips.ethereum.org/EIPS/eip-1155)
 *   - TODO document how this contract deviates from standard ERC1155 functionality?
 *
 * ##### Inherits
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
 * ##### Implements
 *
 * - [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
 * - [IERC1155MetadataURI](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155MetadataURI)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses
 *
 * - [RemovalIdLib](./RemovalIdLib.md) for uint256
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract Removal is
  ERC1155SupplyUpgradeable,
  PausableAccessPreset,
  MulticallUpgradeable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  /**
   * @notice Role conferring the the ability to mark a removal as released.
   */
  bytes32 public constant RELEASER_ROLE = keccak256("RELEASER_ROLE");

  /**
   * @notice Role conferring the ability to mint removals as well as the ability to list minted removals that have yet
   * to be listed for sale.
   */
  bytes32 public constant CONSIGNOR_ROLE = keccak256("CONSIGNOR_ROLE");

  /**
   * @notice The `Market` contract that removals can be bought and sold from.
   */
  Market internal _market;

  /**
   * @notice The `Certificate` contract that removals are retired into.
   */
  Certificate private _certificate;

  // todo Test accounting for `_projectIdToHoldbackPercentage` is maintained correctly (assuming we need it)
  mapping(uint256 => uint8) private _projectIdToHoldbackPercentage;
  // todo Test accounting for `_removalIdToProjectId` is maintained correctly (assuming we need it)
  // todo consider moving `Removal._removalIdToProjectId` to rNori
  mapping(uint256 => uint256) private _removalIdToProjectId;
  // todo Test accounting for `_addressToOwnedTokenIds` is maintained correctly (assuming we need it)
  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToOwnedTokenIds;
  uint256 private _currentMarketBalance;

  /**
   * @notice Emitted on updating the addresses for contracts.
   *
   * @param market The address of the new `market` contract.
   * @param certificate The address of the new `certificate` contract.
   */
  event ContractAddressesRegistered(Market market, Certificate certificate);

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
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __ERC1155_init_unchained("https://nori.com/api/removal/{id}.json");
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Multicall_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(CONSIGNOR_ROLE, _msgSender());
    _grantRole(RELEASER_ROLE, _msgSender());
  }

  /**
   * @dev Registers the market, and certificate contracts so that they can be referenced in this contract.
   * Called as part of the market contract system deployment process.
   *
   * @param market The address of the `market` contract.
   * @param certificate The address of the `certificate` contract.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`
   * - Can only be used when this contract is not paused
   */
  function registerContractAddresses(Market market, Certificate certificate)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _market = market;
    _certificate = certificate;
    emit ContractAddressesRegistered(market, certificate);
  }

  /**
   * @notice Mints multiple removals at once (for a single supplier).
   *
   * @dev If `to` is the market address, the removals are listed for sale in the market.
   *
   * @param to The recipient of this batch of removals. Should be the supplier's address or the market address.
   * @param amounts Each removal's tonnes of CO2 formatted.
   * @param removals The removals to mint (represented as an array of `UnpackedRemovalIdV0`). These removals are used
   * to encode the removal IDs.
   * @param projectId The project id for this batch of removals.
   * @param scheduleStartTime The start time of the schedule for this batch of removals.
   * @param holdbackPercentage The holdback percentage for this batch of removals.
   *
   * ##### Requirements:
   * - Can only be used when the caller has the `CONSIGNER_ROLE`
   * - Enforces the rules of `Removal._beforeTokenTransfer`
   *
   * TODO add remaining `mintBatch` requirements docs
   */
  function mintBatch(
    address to,
    uint256[] calldata amounts,
    UnpackedRemovalIdV0[] calldata removals,
    uint256 projectId,
    uint256 scheduleStartTime,
    uint8 holdbackPercentage
  ) external whenNotPaused onlyRole(CONSIGNOR_ROLE) {
    uint256[] memory removalIds = _createRemovalDataBatch({
      removals: removals,
      projectId: projectId
    });
    _projectIdToHoldbackPercentage[projectId] = holdbackPercentage;
    _mintBatch({to: to, ids: removalIds, amounts: amounts, data: ""});
    RestrictedNORI rNori = RestrictedNORI(_market.restrictedNoriAddress());
    if (!rNori.scheduleExists({scheduleId: projectId})) {
      rNori.createSchedule({
        projectId: projectId,
        startTime: scheduleStartTime,
        methodology: removals[0].methodology, // todo enforce same methodology+version across ids?
        methodologyVersion: removals[0].methodologyVersion
      });
    }
  }

  /**
   * @notice Mints additional balance for multiple removals at once (for a single supplier).
   * @param to The supplier address or market address.
   * @param amounts Each removal's additional tonnes of CO2 formatted.
   * @param ids The removal IDs to add balance for.
   *
   * @dev If `to` is the market address, the removals are listed for sale in the market.
   *
   * ##### Requirements:
   * - IDs must already have been minted via `mintBatch`.
   * - Enforces the rules of `Removal._beforeTokenTransfer`.
   */
  function addBalance(
    address to,
    uint256[] calldata amounts,
    uint256[] calldata ids
  ) external whenNotPaused onlyRole(CONSIGNOR_ROLE) {
    for (uint256 i = 0; i < ids.length; i++) {
      if (_removalIdToProjectId[ids[i]] == 0) {
        revert RemovalNotYetMinted({tokenId: ids[i]});
      }
    }
    _mintBatch({to: to, ids: ids, amounts: amounts, data: ""});
  }

  /**
   * @notice Lists the provided `amount` of the specified removal `id` for sale in Nori's marketplace.
   *
   * @dev The Market contract implements `onERC1155Received`, which is invoked upon receipt of any tokens from
   * this contract, and handles the mechanics of listing this token for sale.
   *
   * @param from The current owner of the specified token ID and amount
   * @param id The token ID of the removal token being listed for sale
   * @param amount The balance of this token ID to transfer to the Market contract
   */
  function consign(
    address from,
    uint256 id,
    uint256 amount
  ) external whenNotPaused onlyRole(CONSIGNOR_ROLE) {
    // todo test that checks consignment can happen using multi call with mix-match project ids
    _safeTransferFrom({
      from: from,
      to: address(_market),
      id: id,
      amount: amount,
      data: ""
    });
  }

  /**
   * @notice Accounts for carbon that has failed to meet its permanence guarantee and has been released into
   * the atmosphere prematurely.
   *
   * @dev Releases `amount` of removal `removalId` by burning it. The replacement of released removals that had
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
   * certificates. The remaining released amount is burned from the Certificate contract's balance and certificate
   * balances are decremented iteratively across each certificate until the amount is exhausted (e.g., if a removal
   * of amount 3 releases an amount of 2.5 and that removal is owned by 3 certificates containing an amount of 1 each
   * from the released removal, the resulting certificate's removal balances for this removal are: 0, 0, and 0.5).
   *
   * - The rules of `_beforeTokenTransfer` are enforced.
   * - The caller must have the `RELEASER_ROLE`.
   * - The rules of `_burn` are enforced.
   *
   * @param removalId The ID of the removal to release some amount of.
   * @param amount The amount of the removal to release.
   */
  function release(uint256 removalId, uint256 amount)
    external
    whenNotPaused
    onlyRole(RELEASER_ROLE)
  {
    // todo might need to add pagination/incremental if removal spans a ton of certificates and reaches max gas
    uint256 amountReleased = 0;
    uint256 unlistedBalance = balanceOf({
      account: RemovalIdLib.supplierAddress(removalId),
      id: removalId
    });
    if (unlistedBalance > 0) {
      uint256 amountToRelease = MathUpgradeable.min(amount, unlistedBalance);
      _releaseFromSupplier({removalId: removalId, amount: amountToRelease});
      amountReleased += amountToRelease;
    }
    if (amountReleased < amount) {
      uint256 listedBalance = balanceOf(this.marketAddress(), removalId);
      if (listedBalance > 0) {
        uint256 amountToRelease = MathUpgradeable.min(
          amount - amountReleased,
          listedBalance
        );
        _releaseFromMarket({amount: amountToRelease, removalId: removalId});
        amountReleased += amountToRelease;
      }
      if (amountReleased < amount) {
        if (balanceOf(this.certificateAddress(), removalId) > 0) {
          uint256 amountToRelease = amount - amountReleased;
          _releaseFromCertificate({
            removalId: removalId,
            amount: amount - amountReleased
          });
          amountReleased += amountToRelease;
        }
      }
    }
  }

  /**
   * @dev See {IERC1155-safeTransferFrom}.
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public override whenNotPaused {
    if (_msgSender() != address(_market)) {
      revert ForbiddenTransfer();
    }
    super.safeTransferFrom(from, to, id, amount, data);
  }

  /**
   * @dev See {IERC1155-safeBatchTransferFrom}.
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override whenNotPaused {
    if (_msgSender() != address(_market)) {
      revert ForbiddenTransfer();
    }
    super.safeBatchTransferFrom(from, to, ids, amounts, data);
  }

  /**
   * @notice The address of the `Market` contract.
   */
  function marketAddress() external view returns (address) {
    return address(_market);
  }

  /**
   * @notice The address of the `Certificate` contract.
   */
  function certificateAddress() external view returns (address) {
    return address(_certificate);
  }

  /**
   * @notice Gets the project id (which is the removal's schedule id in RestrictedNORI) for a given removal id.
   *
   * @param removalId The removal token ID for which to retrieve the project id
   */
  function getProjectId(uint256 removalId) external view returns (uint256) {
    return _removalIdToProjectId[removalId];
  }

  /** @notice Gets the holdback percentage for a removal. */
  function getHoldbackPercentage(uint256 id) external view returns (uint8) {
    return _projectIdToHoldbackPercentage[_removalIdToProjectId[id]];
  }

  function getMarketBalance() external view returns (uint256) {
    return _currentMarketBalance;
  }

  function numberOfTokensOwnedByAddress(address account)
    external
    view
    returns (uint256)
  {
    return _addressToOwnedTokenIds[account].length();
  }

  /**
   * @notice Unpacks a V0 removal id into its component data.
   */
  function unpackRemovalIdV0(uint256 removalId)
    external
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return RemovalIdLib.unpackRemovalIdV0(removalId);
  }

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

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @notice Hook that is called before before any token transfer. This includes minting and burning, as well as
   * batched variants.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - Enforces the rules of `ERC1155Upgradeable._beforeTokenTransfer`.
   * - Enforces the rules of `ERC1155SupplyUpgradeable._beforeTokenTransfer`.
   * TODO rest
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override whenNotPaused {
    for (uint256 i = 0; i < ids.length; ++i) {
      uint256 id = ids[i];
      if (amounts[i] == 0) {
        revert InvalidTokenTransfer({tokenId: id});
      }
      address market = address(_market);
      if (to == market) {
        _currentMarketBalance += amounts[i];
      }
      if (from == market) {
        _currentMarketBalance -= amounts[i];
      }
      if (
        to != RemovalIdLib.supplierAddress(id) &&
        to != market &&
        to != address(_certificate) &&
        to != address(0)
      ) {
        revert ForbiddenTransfer();
      }
    }
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _releaseFromSupplier(uint256 removalId, uint256 amount) internal {
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    emit RemovalReleased(removalId, supplierAddress, amount);
    super._burn(supplierAddress, removalId, amount);
  }

  function _createRemovalDataBatch(
    UnpackedRemovalIdV0[] calldata removals,
    uint256 projectId
  ) internal returns (uint256[] memory) {
    uint256[] memory removalIds = new uint256[](removals.length);
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < removals.length; ++i) {
        uint256 removalId = RemovalIdLib.createRemovalId({
          removal: removals[i]
        });
        _createRemovalData({removalId: removalId, projectId: projectId});
        removalIds[i] = removalId;
      }
    }
    return removalIds;
  }

  function _createRemovalData(uint256 removalId, uint256 projectId) internal {
    _validateRemoval({id: removalId});
    _removalIdToProjectId[removalId] = projectId;
  }

  function _releaseFromMarket(uint256 removalId, uint256 amount) internal {
    super._burn(this.marketAddress(), removalId, amount);
    _market.release(removalId, amount);
    emit RemovalReleased(removalId, this.marketAddress(), amount);
  }

  function _releaseFromCertificate(uint256 removalId, uint256 amount) internal {
    uint256 amountReleased = 0;
    Certificate.Balance[] memory certificatesOfRemoval = _certificate
      .certificatesOfRemoval(removalId);
    uint256 numberOfCertificatesForRemoval = certificatesOfRemoval.length;
    bytes[] memory releaseCalls = new bytes[](numberOfCertificatesForRemoval);
    for (uint256 i = 0; i < numberOfCertificatesForRemoval; ++i) {
      Certificate.Balance memory certificateBalance = certificatesOfRemoval[i];
      uint256 amountToReleaseFromCertificate = MathUpgradeable.min(
        amount - amountReleased,
        certificateBalance.amount
      );
      amountReleased += amountToReleaseFromCertificate;
      super._burn(
        this.certificateAddress(),
        removalId,
        amountToReleaseFromCertificate
      );
      releaseCalls[i] = abi.encodeWithSelector(
        _certificate.releaseRemoval.selector,
        certificateBalance.id,
        removalId,
        amountToReleaseFromCertificate
      );
      emit RemovalReleased(
        removalId,
        this.certificateAddress(),
        amountToReleaseFromCertificate
      );
      if (amountReleased == amount) break;
    }
    _certificate.multicall(releaseCalls);
  }

  function _afterTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override {
    _updateOwnedTokenIds(from, to, ids);
    super._afterTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _updateOwnedTokenIds(
    address from,
    address to,
    uint256[] memory ids
  ) internal {
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < ids.length; ++i) {
        uint256 id = ids[i];
        if (from != address(0)) {
          if (balanceOf(from, id) == 0) {
            _addressToOwnedTokenIds[from].remove(id);
          }
        }
        if (to != address(0)) {
          _addressToOwnedTokenIds[to].add(id);
        }
      }
    }
  }

  function _validateRemoval(uint256 id) internal view {
    if (_removalIdToProjectId[id] != 0) {
      revert InvalidData();
    }
  }
}
