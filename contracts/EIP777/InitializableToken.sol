// pragma solidity ^0.4.24;

// import "./UnstructuredTokenBase.sol";

// contract InitializableToken is UnstructuredTokenBase("","",1) {

//   // using SafeMath for uint256;

//   // string private mName;
//   // string private mSymbol;
//   // uint256 private mGranularity;
//   // uint256 private mTotalSupply;
//   // bool internal _initialized;

//   // bool private mErc20compatible;

//   // mapping(address => uint) private mBalances;
//   // mapping(address => mapping(address => bool)) private mAuthorized;
//   // mapping(address => mapping(address => uint256)) private mAllowed;

//   // ///  @notice This modifier is applied to erc20 obsolete methods that are
//   // ///  implemented only to maintain backwards compatibility. When the erc20
//   // ///  compatibility is disabled, this methods will fail.
//   // modifier erc20 () {
//   //   require(mErc20compatible, "The ERC-20 interface is not currently enabled");
//   //   _;
//   // }
//   bool private _initialized;
//   //constructor () public { }

//   function initialize(
//     string _name,
//     string _symbol,
//     uint256 _granularity,
//     uint256 _totalSupply,
//     address _eip820RegistryAddr,
//     address _owner
//   ) public {
//     require(!_initialized, "You can only initialize this contract once.");
//     mName = _name;
//     mSymbol = _symbol;
//     mTotalSupply = _totalSupply;
//     mErc20compatible = true;
//     require(_granularity >= 1, "Token granularity must be >= 1");
//     mGranularity = _granularity;

//     setOwner(_owner);

//     // setIntrospectionRegistry(_eip820RegistryAddr);
//     erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
//     setInterfaceImplementation("IEIP777", this);
//     setInterfaceImplementation("Ierc20", this);

//     _initialized = true;
//   }

//   /**
//     @dev returns the current initalization status
//   */
//   function initialized() public view returns(bool) {
//     return _initialized;
//   }

// }