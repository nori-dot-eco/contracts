pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721MetadataMintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/ERC721Pausable.sol";

//todo deprecate
contract NCCR_V0 is ERC721Full, ERC721MetadataMintable, ERC721Pausable {

  // mapping of tokenId -> to a string of human readable data
  mapping(uint256 => string) private _tokenData;

  function initialize() public initializer {
    ERC721.initialize();
    ERC721Enumerable.initialize();
    ERC721Metadata.initialize("Nori Certificate of Carbon Removal", "NCCR");
    ERC721MetadataMintable.initialize(msg.sender);
    ERC721Pausable.initialize(msg.sender);
  }

  /**
   * @dev Function to mint tokens with a URI and human readable data
   * @param to The address that will receive the minted tokens.
   * @param tokenId The token id to mint.
   * @param tokenURI The token URI of the minted token.
   * @param tokenData The human readable data to associate with the minted token
   * @return A boolean that indicates if the operation was successful.
   */
  function mintWithTokenURIAndData(
    address to,
    uint256 tokenId,
    string memory tokenURI,
    string memory tokenData
  ) public onlyMinter returns (bool) {
    _mint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    _setTokenData(tokenId, tokenData);
    return true;
  }

  /**
   * @dev Private function to set human readable data for a given token during minting
   * Reverts if the token ID does not exist
   * @param tokenId uint256 ID of the token to set data for
   * @param data string data to assign
   */
  function _setTokenData(uint256 tokenId, string memory data) private {
    require(_exists(tokenId), "The tokenId must exist");
    _tokenData[tokenId] = data;
  }

  /**
   * @dev Returns the human readable data for a given token ID
   * Throws if the token ID does not exist. May return an empty string.
   * @param tokenId uint256 ID of the token to query
   */
  function tokenData(uint256 tokenId) external view returns (string memory) {
    require(_exists(tokenId), "The tokenId must exist");
    return _tokenData[tokenId];
  }

  function mintWithTokenURI(address, uint256, string memory) public onlyMinter returns (bool) {
    revert("NCCRs must be minted using a data parameter");
  }

  function approve(address, uint256) public {
    revert("NNCCRs are retired after they are minted.");
  }

  function setApprovalForAll(address, bool) public {
    revert("NCCRs are retired after they are minted.");
  }

  function transferFrom(address, address, uint256) public {
    revert("NCCRs are retired after they are minted.");
  }

  function safeTransferFrom(address, address, uint256) public {
    revert("NCCRs are retired after they are minted.");
  }

  function safeTransferFrom(
    address,
    address,
    uint256,
    bytes memory
  ) public {
    revert("NCCRs are retired after they are minted.");
  }

}