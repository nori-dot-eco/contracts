pragma solidity ^0.4.18;

import "./ICommodityRecipient.sol";
import "./ICommodityOperator.sol";
import "./ICommoditySender.sol";
import "../EIP820/DEPRECATEDEIP820Implementer.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";
import "../ownership/Owned.sol";
import "./ICommodity.sol";
import "./DEPRECATEDCommodityStorage.sol";
import "../particpant/IParticipantRegistry.sol";

//todo remove this after switching to CRCV0
contract DEPRECATEDBasicCommodity is Owned, DEPRECATEDEIP820Implementer, ICommodity, DEPRECATEDCommodityStorage {
    using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

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

    function DEPRECATEDBasicCommodity (address _eip820RegistryAddr, address _participantRegistry) public DEPRECATEDEIP820Implementer (_eip820RegistryAddr) { 
        setParticipantRegistry(_participantRegistry);
    }

    /// @dev Transfer event as defined in current draft of ERC721. Emitted every time a commodity
    ///  ownership is assigned, including creations.
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Send( // solhint-disable-line no-simple-event-func-name
        address indexed from,
        address indexed to,
        uint256 tokenId,
        bytes userData,
        address indexed operator,
        bytes operatorData
    ); // solhint-disable-next-line separate-by-one-line-in-contract
    event Burn(address indexed from, uint256 tokenId);

    //todo jaycen onlyowner modifer
    function setParticipantRegistry (address _participantRegistry) public {
        participantRegistry = IParticipantRegistry(_participantRegistry);
    }

    function getParticipantRegistry() public returns(address) {
        return participantRegistry;
    }
    //todo jaycen adding this for now to allow how minting currently works, should look into removing later, at the very least, add onlyOwner modifer and DO NOT LAUNCH
    function toggleParticpantCalling(bool _toggle) public {
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
        return DEPRECATEDCommodityStorage.commodities[_tokenId].locked == false;
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
            DEPRECATEDCommodityStorage.commodities[_tokenId].locked = true;
        }
        emit Transfer(_from, _to, _tokenId);
    }

    /// @notice Returns the number of crcs owned by a specific address.
    /// @param _owner The owner address to check.
    function balanceOf(address _owner) public constant returns (uint256 count) {
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
    )
        internal
    {
        require(_owns(_to, _tokenId));
        address recipientImplementation = interfaceAddr(_to, "ICommodityRecipient");
        if (recipientImplementation != 0) {
            ICommodityRecipient(recipientImplementation).commodityReceived(_operator, _from, _to, _tokenId, _userData, _operatorData);
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
    )
        internal
    {
        require(_approvedFor(_operator, _tokenId));
        address recipientImplementation = interfaceAddr(_to, "ICommodityOperator");
        if (recipientImplementation != 0) {
            ICommodityOperator(recipientImplementation).madeOperatorForCommodity(_operator, _from, _to, _tokenId, _value, _userData, _operatorData);
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
    )
        internal
    {
        require(_approvedFor(_operator, _tokenId));
        address recipientImplementation = interfaceAddr(_to, "ICommoditySender");
        if (recipientImplementation != 0) {
            ICommoditySender(recipientImplementation).commodityToSend(_operator, _from, _to, _tokenId, _userData, _operatorData);
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
    )
        internal
    {
        // TODO (jaycen) PRELAUNCH do we need an operator AND sender caller? Refer to latest erc721 --
        callSender(_operator, _from, _to, _tokenId, _userData, _operatorData, false);

        require(_to != address(0));              // forbid sending to 0x0 (=burning)
        require(_tokenId >= 0);                  // only send positive amounts
        require(_approvedFor(msg.sender, _tokenId) || _owns(_from, _tokenId)); // ensure sender owns that token

        _transfer(_from, _to, _tokenId);
        callRecipent(_operator, _from, _to, _tokenId, _userData, _operatorData, _preventLocking);

        emit Send(_from, _to, _tokenId, _userData, _operator, _operatorData);
    }

    /** @notice Check whether an address is a regular address or not. */
    function isRegularAddress(address _addr) internal constant returns(bool) {
        if (_addr == 0) {
            return false;
        }
        uint size;
        assembly { size := extcodesize(_addr) }
        return size == 0;
    }

    /// @notice Returns the address currently assigned ownership of a given Commodity.
    function ownerOf(uint256 _tokenId)
        public
        view
        returns (address owner)
    {
        owner = commodityIndexToOwner[_tokenId];

        require(owner != address(0));
    }

    /** @notice Send '_value' amount of tokens to address '_to'. */
    function send(address _to, uint256 _tokenId) public {
        doSend(msg.sender, _to, _tokenId, "", msg.sender, "", true);
    }

    /** @notice Send '_value' amount of tokens to address '_to'. */
    function send(address _to, uint256 _tokenId, bytes _userData) public {
        doSend(msg.sender, _to, _tokenId, _userData, msg.sender, "", true);
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
    )
        public
    {
        // Safety check to prevent against an unexpected 0x0 default.
        require(_to != address(0));
        require(!_owns(msg.sender, _tokenId) && _approvedFor(msg.sender, _tokenId));
        callRecipent(_operator, _from, _to, _tokenId, _userData, _operatorData, _preventLocking);

        // Reassign ownership, clear pending approvals, emit Transfer event.
        _transfer(_from, _to, _tokenId);
    }

    /// @notice Transfers a commodity to another address. If transferring to a smart
    /// contract be VERY CAREFUL to ensure that it is aware of ERC-721 .
    /// @param _to The address of the recipient, can be a user or contract.
    /// @param _tokenId The ID of the commodity to transfer.
    function transfer(
        address _to,
        uint256 _tokenId
    )
        public
    {
        // Safety check to prevent against an unexpected 0x0 default.
        require(_to != address(0));
        require(_tokenId >= 0);
        // You can only send your own commodity
        require(_owns(msg.sender, _tokenId));

        // Reassign ownership, clear pending approvals, emit Transfer event.
        _transfer(msg.sender, _to, _tokenId);
    }
}
