pragma solidity ^0.4.18;

import "./DEPRECATEDBasicCommodity.sol";


//Todo Jaycen maybe just move this into Basic commodity to match erc777 formats
contract DEPRECATEDCommodityAuthority is DEPRECATEDBasicCommodity {

    mapping(address => mapping(address => bool)) private mAuthorized;
    mapping(address => mapping(address => uint256)) private mAllowed;

    /*** EVENTS ***/
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);

    /// @dev Marks an address as being approved for transferFrom(), overwriting any previous
    ///  approval. Setting _approved to address(0) clears all transfer approval.
    ///  NOTE: _approve() does NOT send the Approval event. This is intentional because
    ///  _approve() and transferFrom() are used together for putting commodities on auction, and
    ///  there is no value in spamming the log with Approval events in that case.
    function _approve(uint256 _tokenId, address _approved) private {
        DEPRECATEDBasicCommodity.commodityIndexToApproved[_tokenId] = _approved;
    }

    /// @notice Grant another address the right to transfer a specific crc via
    ///  transferFrom(). This is the preferred flow for transfering NFTs to contracts.
    /// @param _to The address to be granted transfer approval. Pass address(0) to
    ///  clear all approvals.
    /// @param _tokenId The ID of the crc that can be transferred if this call succeeds.
    /// @dev Required for ERC-721 compliance.
    function approve(
        address _to,
        uint256 _tokenId
    )
        public
    {
        // Only an owner can grant transfer approval.
        require(_owns(msg.sender, _tokenId));
        // Register the approval (replacing any previous approval).
        _approve(_tokenId, _to);
        emit Approval(msg.sender, _to, _tokenId);
    }

    //TODO (jaycen) PRELAUNCH fix/remove this (if we need it for compatibility reasons  -- disabling for now)
    /** @notice Authorize a third party '_operator' to manage (send) 'msg.sender''s tokens. */
    function authorizeOperator(address _operator) public {
        revert();
    }

    function authorizeOperator(address _operator, uint256 _tokenId) public {
        require(_unlocked(_tokenId));
        require(_operator != msg.sender);
        approve(_operator, _tokenId);
        //todo jaycen probably dont need to pass tokenid anymore, would also be good to find a way to pass the commodity struct itself (currently trying such throws a static memory solidity error :( ))
        callOperator(_operator, msg.sender, _operator, _tokenId, commodities[_tokenId].value, "", "", true);
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
    function isOperatorFor(address _operator, address _tokenHolder) public constant returns (bool) {
        return _operator == _tokenHolder || mAuthorized[_operator][_tokenHolder];
    }

    /** @notice Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. */
    function isOperatorForOne(address _operator, uint256 _tokenId) public constant returns (bool) {
        return _approvedFor(_operator, _tokenId);
    }
    
    //TODO (jaycen) PRELAUNCH fix/remove this (if we need it for compatibility reasons  -- disabling for now)
    /** @notice Send '_value' amount of tokens from the address '_from' to the address '_to'. */
    function operatorSend(address _from, address _to, uint256 _tokenId, bytes _userData, bytes _operatorData) public {
        revert();
    }

    /** @notice Send '_value' amount of tokens from the address '_from' to the address '_to'. */
    function operatorSendOne(address _from, address _to, uint256 _tokenId, bytes _userData, bytes _operatorData) public {
        require(isOperatorForOne(msg.sender, _tokenId));
        doSend(_from, _to, _tokenId, _userData, msg.sender, _operatorData, false);
    }
}