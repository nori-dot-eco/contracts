pragma solidity ^0.4.18;
import "../commodity/DEPRECATEDSplittableCommodity.sol";
import "../commodity/DEPRECATEDVerifiableCommodity.sol";
import "./DEPRECATEDCRCBase.sol";


//todo jaycen lookinto how we can flatten some of this inheritance
contract CRC is DEPRECATEDSplittableCommodity, DEPRECATEDVerifiableCommodity, DEPRECATEDCRCBase {

    string private mName;
    string private mSymbol;

    function CRC(
        string _name,
        string _symbol,
        address _eip820RegistryAddr,
        address _participantRegistry
    )
         public DEPRECATEDBasicCommodity (_eip820RegistryAddr, _participantRegistry)
    {
        mName = _name;
        mSymbol = _symbol;

        setInterfaceImplementation("ICommodity", this);
        setInterfaceImplementation("IMintableCommodity", this);
        setInterfaceImplementation("IVerifiableCommodity", this);
    }

    /** @notice Return the name of the token */
    function name() public constant returns (string) { return mName; }
    /** @notice Return the symbol of the token */
    function symbol() public constant returns(string) { return mSymbol; }
}
