pragma solidity ^0.4.24;


/// @title Contract for testing low-level calls issued from the multisig wallet
contract TestCalls {

  // msg.data.length of the latest call to "receive" methods
  uint public lastMsgDataLength;

  // msg.value of the latest call to "receive" methods
  uint public lastMsgValue;

  uint public uint1;
  uint public uint2;
  bytes public byteArray1;

  modifier setMsgFields {
    lastMsgDataLength = msg.data.length;
    lastMsgValue = msg.value;
    _;
  }

  constructor() public setMsgFields {
    // This constructor will be used to test the creation via multi-sig wallet
  }

  function receive1uint(uint a) public setMsgFields payable {
    uint1 = a;
  }

  function receive2uints(uint a, uint b) public setMsgFields payable {
    uint1 = a;
    uint2 = b;
  }

  function receive1bytes(bytes c) public setMsgFields payable {
    byteArray1 = c;
  }

  function nonPayable() public setMsgFields {
  }

}
