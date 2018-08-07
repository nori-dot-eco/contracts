pragma solidity ^0.4.24;


/// @title Library for commodities. Contains data types and functions for all commodities
/// @author Jaycen Horton (jaycen@nori.eco)
library CommodityLib {
  /*** DATA TYPES ***/

  /// @dev The main commodity struct. Every commodity in Nori is represented by a copy
  ///  of this structure, so great care was taken to ensure that it fits neatly into
  ///  exactly one 256-bit word. Note that the order of the members in this structure
  ///  is important because of the byte-packing rules used by Ethereum.
  ///  Ref: http://solidity.readthedocs.io/en/develop/miscellaneous.html
  struct Commodity {
    // The commodity type identifier number
    // Note that using 64-bit unsigned integers limits us to a "mere"
    // 1.8446744e+19 commodities. This number might seem small until you realize
    // that Ethereum currently has a limit of about 500 million
    // transactions per year! So, this definitely won't be a problem
    // for several years (even as Ethereum learns to scale).
    uint64 category;

    // The timestamp from the block when this commodity became registered
    uint64 timeRegistered;

    // The ID of the parent of this commodity (e.g. the commodity id before it was split
    // set to 0 for brand new commodities which have never been split
    uint256 parentId;

    // The value stored in this particular commodity token (I have upped this from 64 to 256 since erc20 allows
    // 256 supply and we need sales of commodities to be able to represent that amount. todo jaycen I think
    // There exists a solidity trick where putting struct attributes of the same type next to each other to reduce gas
    uint256 value;

    // This attribute is used to prevent multiple transfers of commodities. Once a commodities
    // has been transferred once, this attribute is set to true and cannot be transferred again
    bool locked;

    // reserved for misc. data needed for future commodity types. Set to 0 for commodities
    // with no misc. data.
    bytes misc;
  }
}
