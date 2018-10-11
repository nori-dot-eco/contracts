pragma solidity ^0.4.24;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IRiskMitigationAccount.sol";
import "../lifecycle/Pausable.sol";
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";
import "../contrib/EIP/eip777/contracts/ERC777TokensRecipient.sol";
import "../contrib/EIP/eip777/contracts/ERC777Token.sol";


/**
  @title A Risk Mitigation Account holds restricted NORI tokens for suppliers until they are able
  to provide future proof that they should receive the full balance from a <100% scored CRC
*/
contract RiskMitigationAccountV0_1_0 is IRiskMitigationAccount, Pausable, ERC820Implementer, ERC777TokensRecipient {

  using SafeMath for uint256;

  ERC777Token public tokenContract;
  bool private _initialized;
  bool public preventTokenReceipt;
  address public market;
  mapping(address => uint256) restrictedBalances;

  event TokensReceived(address to, uint256 amount);

  constructor() public { }

  /**
    @notice Initializer function for upgradeable contracts
    @dev We use this function instead of the constructor so that constructor state
    is persisted in the proxy instead of the implementation
    @param _owner the owner of the contract (i.e., `MultiAdmin.address`)
  */
  function initialize(address _owner, address _tokenContract) public {
    require(!_initialized, "You can only initialize a contract once");
    owner = _owner;
    erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
    setInterfaceImplementation("IRiskMitigationAccount", this);
    setInterfaceImplementation("ERC777TokensRecipient", this);
    preventTokenReceipt = false;
    tokenContract = ERC777Token(_tokenContract); //todo get this from contract registry instead
    _initialized = true;
  }

  /**
    @notice Allows the owner to toggle token receipt on and off
    @dev this function is consumed by EIP820/777 contract introspection
    and is triggered whenever this contract is the recipient of a token transfer
    @param _toggle a true/false value to toggle the recipient functionality to
  */
  function toggleTokenReceipt(bool _toggle) public onlyOwner {
    preventTokenReceipt = _toggle;
  }

  //todo onlyThisContract modifier
  //todo add a way to redeem restricted tokens
  /**
    @notice This function stores some tokens for a supplier in a restricted balance.
    @dev This function is invoked when the token contract invokes `tokensReceived`, by way of
    a previous user-invoked call of `token.doSend` which can be done using a function such as
    `token.operatorSend`
    @param _addressToRestrictTokensFor the supplier address to restrict tokens for
    @param _amount the amount of tokens to restrict
  */
  function deposit(address _addressToRestrictTokensFor, uint256 _amount) private whenNotPaused {
    restrictedBalances[_addressToRestrictTokensFor] = restrictedBalances[_addressToRestrictTokensFor].add(_amount);
  }

  /**
    @notice This function withdraws a supplier's restricted tokens
  */
  function withdraw() public whenNotPaused {
    // todo implement whatever is needed to check if they can truly withdraw their restricted tokens
    require(
      restrictedBalances[msg.sender] != 0,
      "You can only withdraw an amount when you have a restricted balance of tokens"
    );
    tokenContract.send( //solium-disable-line security/no-send
      msg.sender,
      restrictedBalances[msg.sender],
      "0x0"
    );
    restrictedBalances[msg.sender] = restrictedBalances[msg.sender].sub(restrictedBalances[msg.sender]);
  }

  /**
    @notice This function returns the restricted token balance for a given address
    @dev This function is invoked when the token contract invokes `tokensReceived`, by way of
    a previous user-invoked call of `token.doSend` which can be done using a function such as
    `token.operatorSend`
    @param _addressToCheck the supplier address to get a restricted token balance for
  */
  function getRestrictedBalance(address _addressToCheck) public view returns(uint256) {
    return restrictedBalances[_addressToCheck];
  }

  /**
    @notice This function is called by the token contract by way of
    a previous user-invoked call of `token.doSend` which can be done using a function such as
    `token.operatorSend`
    @param _amount the amount of tokens
    @param _operatorData the supplier address in bytes format
    @dev this function uses erc820 introspection. It is invoked when
    this contract is made an operator for a commodity
  */
  function tokensReceived(
    address, // operator,
    address, // from,
    address, //  _to,
    uint256 _amount,
    bytes, // userData,
    bytes _operatorData
  ) public whenNotPaused {
    if (preventTokenReceipt) {
      revert("This contract does not currently allow being made the recipient of tokens");
    }
    // convert the supplier address from bytes back to an address
    address supplier = bytesToAddress(_operatorData);
    emit TokensReceived(supplier, _amount);
    deposit(supplier, _amount);
  }

  /**
    @notice This functionconverts a bytes formatted address back into an address
    @param bys the bytes formatted address
    @dev since we don't have access to the seller from the _to param of `tokensReceived`,
      we need to use this function first to decode the `operatorData` param
  */
  function bytesToAddress(bytes bys) private pure returns (address addr) {
    assembly { // solium-disable-line security/no-inline-assembly
      addr := mload(add(bys,20))
    }
  }

}