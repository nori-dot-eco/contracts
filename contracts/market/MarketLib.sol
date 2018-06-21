pragma solidity ^0.4.18;


library MarketLib {
    struct Market {
        address tokenContract;
    }

    // Represents a commodity for sale
    //todo jaycen I think there is a solidity trick where grouping same struct attribute types together reduces gas cost
    struct Sale {
        //token id
        //todo jaycen I think this can be uin64
        uint256 tokenId;
        //commodity type
        uint64 category;
        //sale type
        uint32 saleType;
        // Current owner of sale
        address seller;
        //Commodity value
        uint256 value;
        // misc sale data
        bytes misc;
        // Time when sale started
        // NOTE: 0 if this sale has been concluded
        uint64 startedAt;
    }
}