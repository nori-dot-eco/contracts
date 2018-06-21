pragma solidity ^0.4.24;

interface IEIP820Registry {
  function getManager(address addr) public view returns(address);
  function setManager(address addr, address newManager) public;
  function getInterfaceImplementer(address addr, bytes32 iHash) public constant returns (address);
  function setInterfaceImplementer(address addr, bytes32 iHash, address implementer) public;
}