pragma solidity ^0.4.24;

interface IEIP777 {
    function name() public view returns (string);
    function symbol() public view returns (string);
    function totalSupply() public view returns (uint256);
    function granularity() public view returns (uint256);
    function balanceOf(address owner) public view returns (uint256);

    function send(address to, uint256 amount) public;
    function send(address to, uint256 amount, bytes userData) public;
    function authorizeOperator(address operator) public;
    function revokeOperator(address operator) public;
    function isOperatorFor(address operator, address tokenHolder) public view returns (bool);
    function operatorSend(
      address from,
      address to,
      uint256 amount,
      bytes userData,
      bytes operatorData
    ) public;
    function operatorSend(
      address operator,
      address from,
      address to,
      uint256 amount,
      bytes userData,
      bytes operatorData
    ) public;
    function initialized() public view returns(bool);

    event Sent(
      address indexed from,
      address indexed to,
      uint256 amount,
      bytes userData,
      address indexed operator,
      bytes operatorData
    );
    event Minted(address indexed to, uint256 amount, address indexed operator, bytes operatorData);
    event Burnt(address indexed from, uint256 amount);

    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);
}