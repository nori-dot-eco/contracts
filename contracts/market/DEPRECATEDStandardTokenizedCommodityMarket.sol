pragma solidity ^0.4.18;
import "./MarketLib.sol";
import "./../EIP777/IEIP777.sol";
import "./../commodity/ICommodity.sol";
import "./DEPRECATEDMarket.sol";


contract DEPRECATEDStandardTokenizedCommodityMarket is DEPRECATEDMarket {

    /// @dev Reference to contract tracking commodity ownership
    ICommodity public commodityContract;
    /// @dev Reference to contract tracking token ownership
    IEIP777 public tokenContract;

    mapping (uint256 => MarketLib.Sale) tokenIdToSell;

    event SaleSuccessful(uint256 tokenId, uint256 value, address indexed buyer);
    event SaleCreated(uint256 tokenId, uint64 category, uint32 saleType, address seller, uint256 value, bytes misc, uint64 startedAt);
    event CommodityReceived(address sender);

    function DEPRECATEDStandardTokenizedCommodityMarket(address[] _marketItems, address _eip820RegistryAddr) DEPRECATEDMarket(_marketItems, _eip820RegistryAddr) public {
        setCommodityContract(_marketItems[0]);
        setTokenContract(_marketItems[1]);
        enableEIP777TokensOperator();
        enableCommodityOperator();
    }

    function setCommodityContract (address _commodityContract) internal {
        commodityContract = ICommodity(_commodityContract);
    }

    function setTokenContract (address _tokenContract) internal {
        tokenContract = IEIP777(_tokenContract);
    }

    function _addSale(uint256 _tokenId, MarketLib.Sale _sale) private {

        tokenIdToSell[_tokenId] = _sale;

        emit SaleCreated(
            uint256(_tokenId),
            uint64(_sale.category),
            uint32(_sale.saleType),
            address(_sale.seller),
            uint256(_sale.value),
            bytes(_sale.misc),
            uint64(now)
        );
    }

    /// @dev transfers buyers token to seller
    /// Does NOT transfer sllers commodity (token) to buyer
    function _buy(address _buyer, uint256 _tokenId, uint256 _ammount)
        internal
        returns (uint256)
    {
        // Get a reference to the sale struct
        MarketLib.Sale storage sale = tokenIdToSell[_tokenId];

        // Explicitly check that this Sale is currently live.
        // (Because of how Ethereum mappings work, we can't just count
        // on the lookup above failing. An invalid _tokenId will just
        // return an sale object that is all zeros.)
        require(_isOnSale(sale));

        require(_buyer != sale.seller);

        // Check that the incoming amount is < or equal to the commodity value
        require(_ammount <= sale.value);

        // Grab a reference to the seller before the sale struct
        // gets deleted.
        address seller = sale.seller;

        if (_ammount == sale.value) {
            // The bid is good! Remove the sale before sending the fees
            // to the sender so we can't have a reentrancy attack.
            _removeSale(_tokenId);
        } else if (_ammount < sale.value && _ammount > 0) {
            //todo jaycen make sure that failing half way through and send of tokens failing reverts the sale to original value
            sale.value = _updateSale(_tokenId, _ammount);
        } else {
            revert();
        }

        // Transfer proceeds to seller (if there are any!)
        if (_ammount > 0) {
            // todo jaycen
            //  Calculate the seller's cut.
            // (NOTE: _computeCut() is guaranteed to return a
            //  number <= _ammount, so this subtraction can't go negative.)
            // uint256 marketCut = _computeCut(_ammount);
            // uint256 sellerProceeds = sale.value - marketCut;

            // NOTE: Doing a transfer() in the middle of a complex
            // method like this is generally discouraged because of
            // reentrancy attacks and DoS attacks if the seller is
            // a contract with an invalid fallback function. We explicitly
            // guard against reentrancy attacks by removing the sale
            // before calling transfer(), and the only thing the seller
            // can DoS is the sale of their own commodity! (And if it's an
            // accident, they can call cancelSale(). )
            tokenContract.operatorSend(this, _buyer, seller, _ammount, "0x0", "0x0");
        }

        emit SaleSuccessful(_tokenId, _ammount, _buyer);

        return sale.value;
    }

    function _createSale(
        uint256 _tokenId,
        uint64 _category,
        uint32 _saleType,
        address _seller,
        uint256 _value,
        bytes _misc
    )
        internal
    {
        // todo jaycen PRELAUNCH before launch ensure selling by authorize operator
        // introduces no risk and escrow is definitely not needed
        require(commodityContract.isOperatorForOne(this, _tokenId));
        MarketLib.Sale memory sale = MarketLib.Sale(
            uint256(_tokenId),
            uint64(_category),
            uint32(_saleType),
            _seller,
            uint256(_value),
            bytes(_misc),
            uint64(now)
        );
        _addSale(_tokenId, sale);
    }

    /// @dev Returns true if the commodity is on sale.
    /// @param _sale - sale to check.
    function _isOnSale(MarketLib.Sale storage _sale) internal view returns (bool) {
        return (_sale.startedAt > 0);
    }

    /// @dev Returns true if the claimant owns the token.
    /// @param _claimant - Address claiming to own the token.
    /// @param _tokenId - ID of token whose ownership to verify.
    function _owns(address _claimant, uint256 _tokenId) internal view returns (bool) {
        return (commodityContract.ownerOf(_tokenId) == _claimant);
    }

    // todo jaycen via revokeOperator -- also do we need something similar if someone trys to auth tokens when no crc sales are available? Not sure ive tested for this
    /// @dev Removes a sale from the list of open sales.
    /// @param _tokenId - ID of commodity on sale.
    function _removeSale(uint256 _tokenId) internal {
        delete tokenIdToSell[_tokenId];
    }

    // todo jaycen via revokeOperator
    /// @dev Removes a sale from the list of open sales.
    /// @param _tokenId - ID of commodity on sale.
    function _updateSale(uint256 _tokenId, uint256 _ammount) internal returns (uint256) {
        //todo jaycen only allow this to be called when the market invokes it (require it is less than original and > 0)
        uint256 newSaleValue = tokenIdToSell[_tokenId].value - _ammount;
        tokenIdToSell[_tokenId].value = newSaleValue;
        return newSaleValue;
    }

    /// @dev Transfers an commodity owned by this contract to another address.
    ///  Returns true if the transfer succeeds.
    /// @param _to - Address to transfer commodity to.
    /// @param _tokenId - ID of token to transfer.
    function _transfer(address _from, address _to, uint256 _tokenId, uint256 _ammount) internal {
        // it will throw if transfer fails
        commodityContract.operatorSendOne(msg.sender, _from, _tokenId, "0x0", "0x0");
    }

    function _split(uint256 _tokenId, address _to, uint256 _ammount) internal {
        commodityContract.split(_tokenId, _to, _ammount);
    }
    //todo jaycen can we remove these and just fetch tokenIdToSell?
    function getSalePrice(uint256 _tokenId) public returns (uint) {
        return tokenIdToSell[_tokenId].value;
    }

    function getSaleSeller(uint256 _tokenId) public returns (address) {
        return tokenIdToSell[_tokenId].seller;
    }
}
