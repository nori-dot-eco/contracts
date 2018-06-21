pragma solidity ^0.4.18; // solhint-disable-line compiler-fixed
 
interface IEIP777TokensRecipient {
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    ) public;
}