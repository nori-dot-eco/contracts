pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721MetadataMintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Pausable.sol";

contract CRC_V0 is ERC721Full, ERC721MetadataMintable, ERC721Pausable {

  function initialize() public initializer {
    ERC721.initialize();
    ERC721Enumerable.initialize();
    ERC721Metadata.initialize("Carbon Removal Certificate", "CRC");
    ERC721MetadataMintable.initialize(msg.sender);
    ERC721Pausable.initialize(msg.sender);
  }

  function approve(address, uint256) public {
    revert("CRCs are retired after they are minted. Approving a sending address would be inconsequential");
  }

  function setApprovalForAll(address, bool) public {
    revert("CRCs are retired after they are minted. Approving all CRCs for a sending address would be inconsequential");
  }

  function transferFrom(address, address, uint256) public {
    revert("CRCs are retired after they are minted. You cannot transfer CRCs from an address to another");
  }

  function safeTransferFrom(address, address, uint256) public {
    revert("CRCs are retired after they are minted. You cannot transfer CRCs from an address to another");
  }

  function safeTransferFrom(
    address,
    address,
    uint256,
    bytes memory
  ) public {
    revert("CRCs are retired after they are minted. You cannot transfer CRCs from an address to another");
  }

}