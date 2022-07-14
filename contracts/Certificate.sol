// SPDX-License-Identifier: MIT
pragma solidity =0.8.15; // todo bump solidity version globally to latest

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "erc721a-upgradeable/contracts/ERC721AUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721ABurnableUpgradeable.sol";
import "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";
import "./IERC998ERC1155TopDown.sol";
import {FunctionDisabled, ArrayLengthMismatch} from "./SharedCustomErrors.sol";
import "forge-std/console2.sol"; // todo

error ForbiddenTransferAfterMinting(); // todo error declaration consistency (inside-contract vs outside-of-contract)

// todo what is _msgSenderERC721A
// todo any risk in allowing approve to be called? These are not defined as virtual in 721a...
// todo remove all "see {}" syntax as this only works in the context of OZ contracts (their docgen parses it)
// todo check that whenNotPaused on all mutating functions
// todo check that all transfer functions call _beforeTokenTransfers
/**
 * todo consider removing all batch functions from all contracts (seems gratuitous to include it when you can
 * usually achieve the same effect by inheriting multicall, OR using an external multicall contract)
 */
contract Certificate is
  IERC998ERC1155TopDown,
  ERC721AUpgradeable,
  ERC1155HolderUpgradeable,
  ERC721ABurnableUpgradeable,
  ERC721AQueryableUpgradeable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable,
  OwnableUpgradeable // todo why was this added?
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
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
   * @notice Role conferring the ability to mint certificates
   */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /**
   * @notice Role conferring the ability to pause and unpause mutable functions of the contract
   */
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); // todo PausablePreset?

  mapping(uint256 => mapping(address => mapping(uint256 => uint256)))
    private _balances;

  mapping(address => mapping(uint256 => EnumerableSetUpgradeable.UintSet))
    private _holdersOf; // todo xToY (e.g., ownerToTokenIds) mapping naming convention globally

  mapping(uint256 => EnumerableSetUpgradeable.AddressSet)
    private _childContract; // todo rename

  mapping(uint256 => mapping(address => EnumerableSetUpgradeable.UintSet))
    private _childsForChildContract; // todo rename

  // todo consider renaming tokenId -> certificateId / removalId

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Pauses all functions that can mutate state
   *
   * @dev Used to effectively freeze a contract so that no state updates can occur
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

  function initialize() external initializerERC721A initializer {
    // todo validate initializers
    __ERC721A_init_unchained("Certificate", "NRT");
    __ERC721ABurnable_init_unchained();
    __ERC721AQueryable_init_unchained();
    __Ownable_init();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @dev Gives child balance for a specific child contract and child id .
   */
  function childBalance(
    uint256 certificateTokenId,
    address removalContract,
    uint256 removalTokenId
  ) external view returns (uint256) {
    return _balances[certificateTokenId][removalContract][removalTokenId];
  }

  // todo @dev vs @notice consistency

  /**
   * @dev Gives list of child contract where token ID has childs.
   */
  function childContractsFor(uint256 certificateTokenId)
    external
    view
    returns (address[] memory)
  {
    address[] memory removalContracts = new address[](
      _childContract[certificateTokenId].length()
    );
    for (uint256 i = 0; i < _childContract[certificateTokenId].length(); i++) {
      removalContracts[i] = _childContract[certificateTokenId].at(i);
    }
    return removalContracts;
  }

  /**
   * @dev Returns the list of removal token IDs for the given child contract.
   */
  function childIdsForOn(uint256 tokenId, address childContract)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory childTokenIds = new uint256[](
      _childsForChildContract[tokenId][childContract].length()
    );
    for (
      uint256 i = 0;
      i < _childsForChildContract[tokenId][childContract].length();
      i++
    ) {
      childTokenIds[i] = _childsForChildContract[tokenId][childContract].at(i);
    }
    return childTokenIds;
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
    uint256[] memory removalTokenIds,
    uint256[] memory values,
    bytes memory data
  ) public override returns (bytes4) {
    // todo onlyMarket
    if (removalTokenIds.length != values.length) {
      revert ArrayLengthMismatch("removalTokenIds", "values");
    }
    (address recipient, address removalContract) = abi.decode(
      data,
      (address, address) // todo is it possible to use a struct when decoding and in market when encoding?
    );
    console2.log("removalContract==", removalContract);
    console2.log("recipient2==", recipient);
    uint256 certificateTokenId = ERC721AStorage.layout()._currentIndex;
    for (uint256 i = 0; i < removalTokenIds.length; ++i) {
      _receiveChild(
        certificateTokenId,
        removalContract,
        removalTokenIds[i],
        values[i]
      );
    }
    emit ReceiveChildBatch(
      _msgSender(),
      recipient,
      certificateTokenId,
      removalContract,
      removalTokenIds,
      values
    );
    _mint(recipient, 1);
    return this.onERC1155BatchReceived.selector;
  }

  function setApprovalForAll(address, bool)
    public
    view
    override(ERC721AUpgradeable, IERC721AUpgradeable)
    whenNotPaused
  {
    revert FunctionDisabled();
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
      ERC1155ReceiverUpgradeable,
      ERC721AUpgradeable,
      IERC721AUpgradeable
    )
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
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
    bool missingOperatorRole = !hasRole(
      CERTIFICATE_OPERATOR_ROLE,
      _msgSender()
    );
    if (isNotMinting && isNotBurning && missingOperatorRole) {
      revert ForbiddenTransferAfterMinting();
    }
    super._beforeTokenTransfers(from, to, startTokenId, quantity);
  }

  function _receiveChild(
    uint256 tokenId,
    address childContract,
    uint256 childTokenId,
    uint256 amount
  ) internal {
    if (!_childContract[tokenId].contains(childContract)) {
      // todo can this just be done w/o the if statement since sets only add if it doesnt exist
      _childContract[tokenId].add(childContract);
    }
    if (_balances[tokenId][childContract][childTokenId] == 0) {
      // todo can this just be done w/o the if statement since sets only add if it doesnt exist
      _childsForChildContract[tokenId][childContract].add(childTokenId);
    }
    _balances[tokenId][childContract][childTokenId] += amount;
  }

  // function release() {
  //   // todo
  // }

  // function _removeChild(
  //   uint256 tokenId,
  //   address childContract,
  //   uint256 childTokenId,
  //   uint256 amount
  // ) internal {
  //   require(
  //     amount != 0 || _balances[tokenId][childContract][childTokenId] >= amount,
  //     "ERC998: insufficient child balance for transfer"
  //   );
  //   _balances[tokenId][childContract][childTokenId] -= amount;
  //   if (_balances[tokenId][childContract][childTokenId] == 0) {
  //     _holdersOf[childContract][childTokenId].remove(tokenId);
  //     _childsForChildContract[tokenId][childContract].remove(childTokenId);
  //     if (_childsForChildContract[tokenId][childContract].length() == 0) {
  //       _childContract[tokenId].remove(childContract);
  //     }
  //   }
  // }

  /**
   * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
   * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
   * by default, it can be overridden in child contracts.
   */
  function _baseURI() internal pure override returns (string memory) {
    return "https://nori.com/"; // todo
  }

  // todo extract to inheritable base contract (share logic between market, certificate, others?)
  function _asSingletonArray(uint256 element)
    internal
    pure
    returns (uint256[] memory)
  {
    uint256[] memory array = new uint256[](1);
    array[0] = element;
    return array;
  }
}
