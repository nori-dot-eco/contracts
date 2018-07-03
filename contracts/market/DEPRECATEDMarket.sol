pragma solidity ^0.4.18;
import "./MarketLib.sol";
import "../EIP820/EIP820Implementer.sol";
import "../EIP820/IEIP820Implementer.sol";


contract DEPRECATEDMarket is EIP820Implementer, IEIP820Implementer {
    MarketLib.Market[] public marketItems;
    bool internal preventTokenReceived = true;
    bool internal preventTokenOperator = true;
    bool internal preventCommodityReceived = true;
    bool internal preventCommodityOperator = true;

    function DEPRECATEDMarket (address[] _marketItems, address _eip820RegistryAddr) public {
        setIntrospectionRegistry(_eip820RegistryAddr);
        for (uint i = 0;  i < _marketItems.length; i++) {
            _createMarketItem(_marketItems[i]);
        }
    }

    function _createMarketItem (address _marketItem) internal {
        MarketLib.Market memory marketItem = MarketLib.Market({
            tokenContract: address(_marketItem)
        });
        marketItems.push(marketItem);
    }

    // solhint-disable-next-line no-unused-vars
    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) public view returns(bytes32) {
        return EIP820_ACCEPT_MAGIC;
    }

    function enableEIP777TokensOperator() public {
        preventTokenOperator = false;
        setInterfaceImplementation("IEIP777TokensOperator", this);
    }

    // TODO PRELAUNCH jaycen make only callable by Nori Market operator
    function enableCommodityOperator() public {
        preventCommodityOperator = false;
        setInterfaceImplementation("ICommodityOperator", this);
    }
}
