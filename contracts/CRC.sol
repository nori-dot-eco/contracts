pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Pausable.sol";

contract CRC is Initializable, ERC721, ERC721Enumerable, ERC721Metadata, ERC721Pausable {

  function initialize() public initializer {
    ERC721.initialize();
    ERC721Enumerable.initialize();
    ERC721Metadata.initialize("Carbon Removal Certificate", "CRC");
  }

  // todo onlySupplier
  /**
    * @dev Function to mint CRCs and then to retire them so they can't be transferred again
    * @param to The address that will receive the minted tokens.
    * @param tokenId The token id to mint.
    * @param tokenURI The token URI of the minted token.
    * @return A boolean that indicates if the operation was successful.
    */
  function mintAndRetire(address to, uint256 tokenId, string memory tokenURI) public returns (bool) {
    _mint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    return true;
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