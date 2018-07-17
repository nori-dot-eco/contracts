pragma solidity ^0.4.24;

interface ICommodity {
  function balanceOf(address owner) public view returns (uint256);
  function bundleBalanceOf(address owner) public view returns (uint256);
  function ownerOf(uint256 tokenId) public view returns (address owner);
  // TODO jaycen do we need an ability to transfer all commodities to a new owner?
  function send(address to, uint256 amount) public;
  function send(address to, uint256 amount, bytes userData) public;
  function approve(address to, uint256 tokenId) public;
  // TODO Jaycen -- do we need a way to authorize operator for all commodities owned?
  //function authorizeOperator(address operator) public;
  function authorizeOperator(address operator, uint256 tokenId, bytes operatorData) public;
  function revokeOperator(address operator, uint256 tokenId, bytes operatorData) public;
  // do we need this for backward/third party compat reasons (todo jaycen)
  // function isOperatorFor(address operator, address tokenHolder) public constant returns (bool);
  function isOperatorForOne(address operator, uint256 tokenId) public view returns (bool);
  function operatorSendOne(
    address from, 
    address to, 
    uint256 tokenId, 
    bytes userData, 
    bytes operatorData
  ) public;
  // TODO jaycen do we need an ability to transfer all commodities (from operator) to a new owner?
  function operatorSend(
    address from, 
    address to, 
    uint256 tokenId, 
    bytes userData, 
    bytes operatorData
  ) public;
  // todo jaycen decide if this should be part of this interface. part of that task involces figuring out if we should make commodities just inherit the 721 + 777 interfaces, and then create special interfaces for things like splitting
  function split(uint tokenId, address to, uint256 ammount) public;
  /** Events **/
  event Approved(address indexed owner, address indexed approved, uint256 indexed tokenId);
  event Minted(address indexed to, uint256 amount, address indexed operator, bytes operatorData);
  event Burnt(address indexed from, uint256 amount);
  event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
  event RevokedOperator(address indexed operator, address indexed tokenHolder);
  event Sent( 
    address indexed from,
    address indexed to,
    uint256 amount,
    bytes userData,
    address indexed operator,
    bytes operatorData
  );
}
