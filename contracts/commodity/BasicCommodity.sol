pragma solidity ^0.4.24;

import "./ICommodityRecipient.sol";
import "./ICommodityOperator.sol";
import "./ICommoditySender.sol";
import "../EIP820/EIP820Implementer.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";
import "../ownership/UnstructuredOwnable.sol";
import "./ICommodity.sol";
import "../participant/IParticipantRegistry.sol";
import "../commodity/CommodityLib.sol";


contract BasicCommodity is UnstructuredOwnable, EIP820Implementer, ICommodity {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  /*** EVENTS ***/
  event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
  event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
  event RevokedOperator(address indexed operator, address indexed tokenHolder);
  /// @dev Transfer event as defined in current draft of ERC721. Emitted every time a commodity
  ///  ownership is assigned, including creations.
  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event Send(
    address indexed from,
    address indexed to,
    uint256 tokenId,
    bytes userData,
    address indexed operator,
    bytes operatorData
  );
  event Burn(address indexed from, uint256 tokenId);

  uint256 internal mTotalSupply;
  IParticipantRegistry public participantRegistry;
  bool public onlyParticipantCallers = true;

  /// @dev A mapping from commodity IDs to the address that owns them. All commoditys have
  ///  some valid owner address
  mapping (uint256 => address) public commodityIndexToOwner;

  // @dev A mapping from owner address to count of commoditys that address owns.
  //  Used internally inside balanceOf() to resolve ownership count.
  mapping (address => uint256) ownershipTokenCount;

  /// @dev A mapping from commodity IDs to an address that has been approved to call
  ///  transferFrom(). Each commodity can only have one approved address for transfer
  ///  at any time. A zero value means no approval is outstanding.
  mapping (uint256 => address) public commodityIndexToApproved;

  /// @dev A mapping from commodity IDs to an address that has been approved to split
  ///  this commodity. Each commodity can only have one approved
  ///  address for siring at any time. A zero value means no approval is outstanding.
  mapping (uint256 => address) public commodityAllowedToAddress;

  mapping(address => uint) private mBalances;

  mapping(address => mapping(address => bool)) private mAuthorized;
  mapping(address => mapping(address => uint256)) private mAllowed;

  bool private _initialized;
  string private mName;
  string private mSymbol;


  constructor () public { }

  function initialize(
    string _name,
    string _symbol,
    address _eip820RegistryAddr,
    address _participantRegistry,
    address _owner
  ) public {
    require(!_initialized);
    mName = _name;
    mSymbol = _symbol;
    setParticipantRegistry(_participantRegistry);
    setOwner(_owner);
    setIntrospectionRegistry(_eip820RegistryAddr);
    setInterfaceImplementation("ICommodity", this);
    setInterfaceImplementation("IMintableCommodity", this);
    setInterfaceImplementation("IVerifiableCommodity", this);
  }

  /** @notice Return the name of the token */
  function name() public view returns (string) { return mName; }
  /** @notice Return the symbol of the token */
  function symbol() public view returns(string) { return mSymbol; }

    //todo jaycen not sure this file is even needed, maybe just combine it into storage.
  /// @notice Returns the total number of crcs currently in existence. todo jaycen can this be uint64 and also should this instead return .value of all comms?
  function getTotalSupplyByCategory(uint64 _category) public view returns (uint256) {
    return getTotalSupply(_category);
  }

  function totalSupply() public view returns (uint256) {
    return getTotalSupplyByCategory(1); //todo jaycen fix this static var when we understand crc tiers more
  }

  /// @dev An array containing the Commodity struct for all commodities in existence. The ID
  ///  of each commodity is actually an index into this array.
  CommodityLib.Commodity[] public commodities;

  function getTotalSupply(uint64 _category) public view returns (uint256) {
    uint256 count;
    for (uint256 i = 0; i < commodities.length; i++) {
      if (commodities[i].category == _category) {
        count++;
      }
    }
    return count;
  }

  function getCommodityValueByIndex(uint256 _index) public view returns (uint256) {
    return commodities[_index].value;
  }

  function getCommodityCategoryByIndex(uint256 _index) public view returns (uint256) {
    return commodities[_index].category;
  }

  function getTotalSupply() public view returns (uint256) {
    return commodities.length - 1;
  }

  function _totalSupply() internal view returns (uint256) {
    return commodities.length - 1;
  }



  //todo jaycen onlyowner modifer
  function setParticipantRegistry (address _participantRegistry) public {
    participantRegistry = IParticipantRegistry(_participantRegistry);
  }

  function getParticipantRegistry() public view returns(address) {
    return participantRegistry;
  }
  //todo jaycen adding this for now to allow how minting currently works, should look into removing later, at the very least, add onlyOwner modifer and DO NOT LAUNCH
  function toggleParticipantCalling(bool _toggle) public {
    onlyParticipantCallers = _toggle;
  }

  /// @dev Checks if a given address currently has transferApproval for a particular commodity.
  /// @param _claimant the address we are confirming commodity is approved for.
  /// @param _tokenId commodity id, only valid when > 0
  function _approvedFor(address _claimant, uint256 _tokenId) internal view returns (bool) {
    return commodityIndexToApproved[_tokenId] == _claimant;
  }

  /// @dev Checks if a given address is the current owner of a particular commodity.
  /// @param _claimant the address we are validating against.
  /// @param _tokenId commodity id, only valid when > 0
  function _owns(address _claimant, uint256 _tokenId) internal view returns (bool) {
    return commodityIndexToOwner[_tokenId] == _claimant;
  }

  //todo jaycen make a lockable commodity interface?
  /// @dev check if commodity is locked
  /// @param _tokenId commodity id
  function _unlocked(uint256 _tokenId) internal view returns (bool) {
    return commodities[_tokenId].locked == false;
  }

  /// @dev Assigns ownership of a specific commodity to an address.
  function _transfer(address _from, address _to, uint256 _tokenId) internal {
    //require commodity not locked/retired
    require(_unlocked(_tokenId));
    // since the number of commodities  is capped to 2^32
    // there is no way to overflow this
    ownershipTokenCount[_to]++;
    // transfer ownership
    commodityIndexToOwner[_tokenId] = _to;
    // When creating new commodites _from is 0x0, but we can't account that address.
    if (_from != address(0)) {
      ownershipTokenCount[_from]--;
      // clear any previously approved ownership exchange
      delete commodityIndexToApproved[_tokenId];

      //retire commodity
      commodities[_tokenId].locked = true;
    }
    emit Transfer(_from, _to, _tokenId);
  }

  /// @notice Returns the number of crcs owned by a specific address.
  /// @param _owner The owner address to check.
  function balanceOf(address _owner) public view returns (uint256 count) {
    return ownershipTokenCount[_owner];
  }

  /** @notice Sample burn function to showcase the use of the 'Burn' event. */
  function burn(address _tokenHolder, uint256 _tokenId) public onlyOwner returns(bool) {
    require(_owns(msg.sender, _tokenId));

    ownershipTokenCount[_tokenHolder] = ownershipTokenCount[_tokenHolder].sub(1);

    emit Burn(_tokenHolder, _tokenId);

    return true;
  }

  /** @dev Notify a recipient of received tokens. */
  function callRecipent(
    address _operator,
    address _from,
    address _to,
    uint256 _tokenId,
    bytes _userData,
    bytes _operatorData,
    bool _preventLocking
  ) internal {
    require(_owns(_to, _tokenId));
    address recipientImplementation = interfaceAddr(_to, "ICommodityRecipient");
    if (recipientImplementation != 0) {
      ICommodityRecipient(recipientImplementation).commodityReceived(
        _operator,
        _from,
        _to,
        _tokenId,
        _userData,
        _operatorData
      );
    } else if (_preventLocking) {
      require(isRegularAddress(_to));
    }
  }

  function callOperator(
    address _operator,
    address _from,
    address _to,
    uint256 _tokenId,
    uint256 _value,
    bytes _userData,
    bytes _operatorData,
    bool _preventLocking
  ) internal {
    require(_approvedFor(_operator, _tokenId));
    address recipientImplementation = interfaceAddr(_to, "ICommodityOperator");
    if (recipientImplementation != 0) {
      ICommodityOperator(recipientImplementation).madeOperatorForCommodity(
        _operator,
        _from,
        _to,
        _tokenId,
        _value,
        _userData,
        _operatorData
      );
    } else if (_preventLocking) {
      require(isRegularAddress(_to));
    }
  }

  function callSender(
    address _operator,
    address _from,
    address _to,
    uint256 _tokenId,
    bytes _userData,
    bytes _operatorData,
    bool _preventLocking
  ) internal {
    require(_approvedFor(_operator, _tokenId));
    address recipientImplementation = interfaceAddr(_to, "ICommoditySender");
    if (recipientImplementation != 0) {
      ICommoditySender(recipientImplementation).commodityToSend(
        _operator,
        _from,
        _to,
        _tokenId,
        _userData,
        _operatorData
      );
    } else if (_preventLocking) {
      require(isRegularAddress(_to));
    }
  }

  /** @dev Perform an actual send of tokens. */
  function doSend(
    address _from,
    address _to,
    uint256 _tokenId,
    bytes _userData,
    address _operator,
    bytes _operatorData,
    bool _preventLocking
  ) internal {
    // TODO (jaycen) PRELAUNCH do we need an operator AND sender caller? Refer to latest erc721 --
    callSender(
      _operator,
      _from,
      _to,
      _tokenId,
      _userData,
      _operatorData,
      false
    );

    require(_to != address(0));              // forbid sending to 0x0 (=burning)
    require(_tokenId >= 0);                  // only send positive amounts
    require(_approvedFor(msg.sender, _tokenId) || _owns(_from, _tokenId)); // ensure sender owns that token

    _transfer(_from, _to, _tokenId);
    callRecipent(
      _operator,
      _from,
      _to,
      _tokenId,
      _userData,
      _operatorData,
      _preventLocking
    );

    emit Send(
      _from,
      _to,
      _tokenId,
      _userData,
      _operator,
      _operatorData
    );
  }

  /** @notice Check whether an address is a regular address or not. */
  function isRegularAddress(address _addr) internal view returns(bool) {
    if (_addr == 0) {
      return false;
    }
    uint size;
    assembly { size := extcodesize(_addr) } //solium-disable-line security/no-inline-assembly
    return size == 0;
  }

  /// @notice Returns the address currently assigned ownership of a given Commodity.
  function ownerOf(uint256 _tokenId) public view returns (address owner) {
    owner = commodityIndexToOwner[_tokenId];

    require(owner != address(0));
  }

  /** @notice Send '_value' amount of tokens to address '_to'. */
  function send(address _to, uint256 _tokenId) public {
    doSend(
      msg.sender,
      _to,
      _tokenId,
      "",
      msg.sender,
      "",
      true
    );
  }

  /** @notice Send '_value' amount of tokens to address '_to'. */
  function send(address _to, uint256 _tokenId, bytes _userData) public {
    doSend(
      msg.sender,
      _to,
      _tokenId,
      _userData,
      msg.sender,
      "",
      true
    );
  }

  // Todo jaycen : is sendFrom or operatorSend the accepted standard (check pre-launch) to protect from backward/thirdparty compatibility issues
  function operatorSend(
    address _from,
    address _to,
    uint256 _tokenId,
    bytes _userData,
    address _operator,
    bytes _operatorData,
    bool _preventLocking
  ) public {
    // Safety check to prevent against an unexpected 0x0 default.
    require(_to != address(0));
    require(!_owns(msg.sender, _tokenId) && _approvedFor(msg.sender, _tokenId));
    callRecipent(
      _operator,
      _from,
      _to,
      _tokenId,
      _userData,
      _operatorData,
      _preventLocking
    );

    // Reassign ownership, clear pending approvals, emit Transfer event.
    _transfer(_from, _to, _tokenId);
  }

  /// @notice Transfers a commodity to another address. If transferring to a smart
  /// contract be VERY CAREFUL to ensure that it is aware of ERC-721 .
  /// @param _to The address of the recipient, can be a user or contract.
  /// @param _tokenId The ID of the commodity to transfer.
  function transfer(address _to, uint256 _tokenId) public {
    // Safety check to prevent against an unexpected 0x0 default.
    require(_to != address(0));
    require(_tokenId >= 0);
    // You can only send your own commodity
    require(_owns(msg.sender, _tokenId));

    // Reassign ownership, clear pending approvals, emit Transfer event.
    _transfer(msg.sender, _to, _tokenId);
  }





  /// @dev Marks an address as being approved for transferFrom(), overwriting any previous
  ///  approval. Setting _approved to address(0) clears all transfer approval.
  ///  NOTE: _approve() does NOT send the Approval event. This is intentional because
  ///  _approve() and transferFrom() are used together for putting commodities on auction, and
  ///  there is no value in spamming the log with Approval events in that case.
  function _approve(uint256 _tokenId, address _approved) private {
    commodityIndexToApproved[_tokenId] = _approved;
  }

  /// @notice Grant another address the right to transfer a specific crc via
  ///  transferFrom(). This is the preferred flow for transfering NFTs to contracts.
  /// @param _to The address to be granted transfer approval. Pass address(0) to
  ///  clear all approvals.
  /// @param _tokenId The ID of the crc that can be transferred if this call succeeds.
  /// @dev Required for ERC-721 compliance.
  function approve(address _to, uint256 _tokenId) public {
    // Only an owner can grant transfer approval.
    require(_owns(msg.sender, _tokenId));
    // Register the approval (replacing any previous approval).
    _approve(_tokenId, _to);
    emit Approval(msg.sender, _to, _tokenId);
  }

  //TODO (jaycen) PRELAUNCH fix/remove this (if we need it for compatibility reasons  -- disabling for now)
  /** @notice Authorize a third party '_operator' to manage (send) 'msg.sender''s tokens. */
  function authorizeOperator(address) public pure {
    revert();
  }

  function authorizeOperator(address _operator, uint256 _tokenId) public {
    require(_unlocked(_tokenId));
    require(_operator != msg.sender);
    approve(_operator, _tokenId);
    //todo figure out the best approach for all of these preventLockings
    //todo jaycen probably dont need to pass tokenid anymore, would also be good to find a way to pass the commodity struct itself (currently trying such throws a static memory solidity error :( ))
    callOperator(
      _operator,
      msg.sender,
      _operator,
      _tokenId,
      commodities[_tokenId].value,
      "",
      "",
      false
    );
    emit AuthorizedOperator(_operator, msg.sender);
  }

  /** @notice Revoke a third party '_operator''s rights to manage (send) 'msg.sender''s tokens. */
  function revokeOperator(address _operator) public {
    //todo jaycen call operator to cancel sale on markets
    require(_operator != msg.sender);
    mAuthorized[_operator][msg.sender] = false;
    emit RevokedOperator(_operator, msg.sender);
  }

  // TODO jaycen PRELAUNCH do we need this for backward compatibility/third party compatibility (erc20) reasons?
  /** @notice Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. */
  function isOperatorFor(address _operator, address _tokenHolder) public view returns (bool) {
    return _operator == _tokenHolder || mAuthorized[_operator][_tokenHolder];
  }

  /** @notice Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. */
  function isOperatorForOne(address _operator, uint256 _tokenId) public view returns (bool) {
    return _approvedFor(_operator, _tokenId);
  }

  //TODO (jaycen) PRELAUNCH fix/remove this (if we need it for compatibility reasons  -- disabling for now)
  /** @notice Send '_value' amount of tokens from the address '_from' to the address '_to'. */
  function operatorSend(
    address,
    address,
    uint256,
    bytes,
    bytes
  ) public {
    revert();
  }

  /** @notice Send '_value' amount of tokens from the address '_from' to the address '_to'. */
  function operatorSendOne(
    address _from,
    address _to,
    uint256 _tokenId,
    bytes _userData,
    bytes _operatorData
  ) public {
    require(isOperatorForOne(msg.sender, _tokenId));
    doSend(
      _from,
      _to,
      _tokenId,
      _userData,
      msg.sender,
      _operatorData,
      false
    );
  }
}
