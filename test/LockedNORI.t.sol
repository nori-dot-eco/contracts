// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@/test/helpers/test.sol";
import "@/contracts/test/MockERC777.sol";
import "@/contracts/test/MockERC20Permit.sol";
import "@/contracts/test/PermitSigner.sol";
import "@/contracts/test/LockedNORIHelper.sol";
import "@/contracts/LockedNORI.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC1820RegistryUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

abstract contract ERC777ERC1820 is
  IERC777RecipientUpgradeable,
  IERC777SenderUpgradeable,
  PermitSigner
{
  function tokensReceived(
    address,
    address,
    address,
    uint256,
    bytes calldata,
    bytes calldata
  ) external view {
    console2.log("ERC777ERC1820: tokensReceived");
  }

  function tokensToSend(
    address,
    address,
    address,
    uint256,
    bytes calldata,
    bytes calldata
  ) external view {
    console2.log("ERC777ERC1820: tokensToSend");
  }
}

contract Recipient {
  address internal constant _ERC1820_REGISTRY_ADDRESS =
    0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24;
  uint256 internal _receiveCounter;
  uint256 internal _sendCounter;
  bool internal _shouldAttackToSend;
  bool internal _shouldAttackReceived;
  LockedNORI internal _lNori;
  MockERC777 internal _bpNori;

  constructor(
    address lNoriAddress,
    bool attackReceived,
    bool attackToSend
  ) {
    _receiveCounter = 0;
    _shouldAttackToSend = attackToSend;
    _shouldAttackReceived = attackReceived;
    IERC1820RegistryUpgradeable _registry = IERC1820RegistryUpgradeable(
      _ERC1820_REGISTRY_ADDRESS
    );
    _lNori = LockedNORI(lNoriAddress);
    _registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensSender"),
      address(this)
    );
    _registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensRecipient"),
      address(this)
    );
  }

  function tokensReceived(
    address operator,
    address,
    address,
    uint256 amount,
    bytes calldata,
    bytes calldata
  ) external {
    _receiveCounter = _receiveCounter + 1;
    console2.log(
      "tokensReceived - recipient contract, call count: %s, operator: %s, amount: %s",
      _sendCounter,
      operator,
      amount
    );
    if (_shouldAttackReceived) {
      if (_receiveCounter == 2) {
        console2.log("Re-entry attempt from tokensReceived");
        _lNori.withdrawTo(address(this), amount - 1);
      }
    }
  }

  function tokensToSend(
    address operator,
    address,
    address,
    uint256 amount,
    bytes calldata,
    bytes calldata
  ) external {
    _sendCounter = _sendCounter + 1;
    console2.log(
      "tokensToSend - recipient contract, call count: %s, operator: %s, amount: %s",
      _sendCounter,
      operator,
      amount
    );
    if (_shouldAttackToSend) {
      if (msg.sender == address(_lNori) && _sendCounter < 2) {
        console2.log("Re-entry attempt from tokensToSend");
        _lNori.withdrawTo(address(this), amount - 1);
      }
    }
  }
}

// https://tagmerge.com/issue/gakonst/foundry/693
contract LockedNORITest is
  Global,
  ERC777ERC1820 // todo use pattern established in Removal/certificate/etc tests
{
  address internal constant _ERC1820_REGISTRY_ADDRESS =
    0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24;
  uint256 internal constant _SEED_AMOUNT = 1_000_000_000_000_000_000_000_000;
  uint256 internal constant _GRANT_AMOUNT = 100_000_000_000_000_000;
  IERC1820RegistryUpgradeable internal _registry;
  address internal _admin = vm.addr(69); // todo use named accounts
  LockedNORI internal _lNori;
  MockERC777 internal _erc777;
  MockERC20Permit internal _erc20;
  LockedNORIHelper internal _helper;
  PermitSigner internal _signer;

  event Approval(address indexed owner, address indexed spender, uint256 value); // todo

  function setUp() external {
    vm.etch(
      address(_ERC1820_REGISTRY_ADDRESS),
      bytes(
        hex"608060405234801561001057600080fd5b50600436106100a5576000357c0100000000000000000000000000000000000000000000"
        hex"00000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b7056765146102365780"
        hex"63f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36"
        hex"c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a0381358116916020810135"
        hex"91604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b"
        hex"60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b506001"
        hex"60a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564"
        hex"010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100"
        hex"000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e06004803603"
        hex"60408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b61010860048036"
        hex"03604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c"
        hex"57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360"
        hex"200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319"
        hex"166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614"
        hex"610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e61676572000000"
        hex"0000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e56002"
        hex"0a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e20455243313635206861736800000000"
        hex"0000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b15"
        hex"6104ff5760405160200180807f455243313832305f4143434550545f4d414749430000000000000000000000008152506014019050"
        hex"6040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c010000"
        hex"00000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a0"
        hex"60020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e"
        hex"3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd028152602060"
        hex"04820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081"
        hex"900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffff"
        hex"ffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a4"
        hex"1313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a57508061"
        hex"05b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060"
        hex"020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e6167"
        hex"65720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a06002"
        hex"0a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffff"
        hex"ffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011"
        hex"ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020"
        hex"818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a0"
        hex"60020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffff"
        hex"ffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001"
        hex"179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad8282"
        hex"6108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a03908116600090815260208181526040808320"
        hex"86845290915290205416905092915050565b6000808061081d857f01ffc9a700000000000000000000000000000000000000000000"
        hex"00000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e06002"
        hex"0a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b9092"
        hex"50905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a"
        hex"0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb8383"
        hex"6107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a03198716845290"
        hex"91529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f"
        hex"01ffc9a700000000000000000000000000000000000000000000000000000000808252600482018390526000918291906020816024"
        hex"8189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2"
        hex"c4734c126b524e6c0029"
      )
    );
    _registry = IERC1820RegistryUpgradeable(_ERC1820_REGISTRY_ADDRESS);
    _registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensSender"),
      address(this)
    );
    _registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensRecipient"),
      address(this)
    );
    _erc777 = _deployMockERC777(); // todo
    _erc20 = _deployMockERC20(); // todo
    _lNori = _deployLockedNORI(address(_erc20)); // todo
    _helper = new LockedNORIHelper(); // todo
    _signer = new PermitSigner(); // todo
    // if (bpNori.balanceOf(address(this)) != _SEED_AMOUNT) { // todo
    //   revert("Seed amount does not equal balance");
    // }
  }

  function testBatchGrantCreation() external {
    // todo
    address recipient = vm.addr(0xa11ce);
    uint256 grantAdminKey = 0xabcdef;
    address grantAdmin = vm.addr(grantAdminKey);
    _erc20.transfer(grantAdmin, _GRANT_AMOUNT);
    assertEq(_erc20.balanceOf(address(grantAdmin)), _GRANT_AMOUNT);
    _lNori.grantRole(_lNori.TOKEN_GRANTER_ROLE(), grantAdmin);
    uint256 deadline = 1 days;
    bytes memory params = _helper.getSimpleGrantCreationParamsEncoded(
      recipient,
      1 days
    );
    vm.startPrank(grantAdmin);
    bytes32 digest = _signer.digestPermitCall(
      address(_erc20),
      address(_lNori),
      _GRANT_AMOUNT,
      deadline
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(grantAdminKey, digest);
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = _GRANT_AMOUNT;
    bytes[] memory data = new bytes[](1);
    data[0] = params;
    vm.expectEmit(true, true, true, false);
    emit Approval(address(grantAdmin), address(_lNori), _GRANT_AMOUNT);
    _lNori.batchCreateGrants(amounts, data, deadline, v, r, s);
    _helper.assertSimplePastGrant(address(_lNori), _lNori.getGrant(recipient));
    assertEq(_erc20.balanceOf(grantAdmin), 0);
    assertEq(_erc20.balanceOf(address(_lNori)), _GRANT_AMOUNT);
    assertEq(_lNori.balanceOf(recipient), _GRANT_AMOUNT);
    assertEq(_lNori.vestedBalanceOf(recipient), 0);
    assertEq(_lNori.unlockedBalanceOf(recipient), 0);
    vm.warp(366 days);
    assertEq(_lNori.balanceOf(recipient), _GRANT_AMOUNT);
    assertEq(_lNori.vestedBalanceOf(recipient), _GRANT_AMOUNT);
    assertEq(_lNori.unlockedBalanceOf(recipient), _GRANT_AMOUNT);
    vm.stopPrank();
  }

  function testTokensReceivedReverts() external {
    vm.expectRevert(
      "ERC777: token recipient contract has no implementer for ERC777TokensRecipient"
    );
    _erc777.send(address(_lNori), _GRANT_AMOUNT, "");
  }

  // This test is no longer an issue because the underlying was switched to ERC20
  function testReentryTokensReceived() external {
    Recipient recipient = new Recipient(address(_lNori), true, false);
    _issueGrant(address(recipient), 1 days);
    vm.warp(366 days);
    uint256 balance = _lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    _lNori.withdrawTo(address(recipient), balance);
    assertEq(_lNori.unlockedBalanceOf(address(recipient)), 0);
    assertEq(_erc20.balanceOf(address(recipient)), _GRANT_AMOUNT);
  }

  function testReentryTokensToSend() external {
    Recipient recipient = new Recipient(address(_lNori), false, true);
    _issueGrant(address(recipient), 1 days);
    vm.warp(366 days);
    uint256 balance = _lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    vm.expectRevert("lNORI: insufficient balance");
    _lNori.withdrawTo(address(recipient), balance);
  }

  function testNormalWithdrawal() external {
    Recipient recipient = new Recipient(address(_lNori), false, false);
    _issueGrant(address(recipient), 1 days);
    vm.warp(366 days);
    uint256 balance = _lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    _lNori.withdrawTo(address(recipient), balance);
    assertEq(_lNori.unlockedBalanceOf(address(recipient)), 0);
    assertEq(_erc20.balanceOf(address(recipient)), _GRANT_AMOUNT);
  }

  function _issueGrant(address recipientAddress, uint256 fromTime) internal {
    uint256 amount = _GRANT_AMOUNT;
    _lNori.createGrant(
      amount,
      recipientAddress,
      fromTime,
      fromTime + 365 days,
      fromTime + 365 days,
      fromTime,
      fromTime,
      0,
      0,
      0,
      0
    );
    _erc20.approve(address(_lNori), _GRANT_AMOUNT);
    _lNori.depositFor(recipientAddress, _GRANT_AMOUNT);
  }

  function _deployProxy(address _impl, bytes memory initializer)
    internal
    returns (address)
  {
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
      _impl,
      _admin,
      initializer
    );
    return address(proxy);
  }

  function _deployLockedNORI(address erc20_) internal returns (LockedNORI) {
    LockedNORI impl = new LockedNORI();
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      erc20_
    );
    return LockedNORI(_deployProxy(address(impl), initializer));
  }

  function _deployMockERC20() internal returns (MockERC20Permit) {
    // todo
    MockERC20Permit impl = new MockERC20Permit();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC20Permit(_deployProxy(address(impl), initializer));
  }

  function _deployMockERC777() internal returns (MockERC777) {
    // todo
    MockERC777 impl = new MockERC777();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC777(_deployProxy(address(impl), initializer));
  }
}
