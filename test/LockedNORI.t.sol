pragma solidity 0.8.15;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "../contracts/test/MockERC777.sol";
import "../contracts/test/MockERC20Permit.sol";
import "../contracts/test/PermitSigner.sol";
import "../contracts/test/LockedNORIV2Helper.sol";
import "../contracts/LockedNORIV2.sol";
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
  address constant _ERC1820_REGISTRY_ADDRESS =
    0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24;
  uint256 receiveCounter;
  uint256 sendCounter;
  bool shouldAttackToSend;
  bool shouldAttackReceived;
  LockedNORIV2 lNori;
  MockERC777 bpNori;

  constructor(
    address lNoriAddress,
    bool attackReceived,
    bool attackToSend
  ) {
    receiveCounter = 0;
    shouldAttackToSend = attackToSend;
    shouldAttackReceived = attackReceived;
    IERC1820RegistryUpgradeable registry = IERC1820RegistryUpgradeable(
      _ERC1820_REGISTRY_ADDRESS
    );
    lNori = LockedNORIV2(lNoriAddress);
    registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensSender"),
      address(this)
    );
    registry.setInterfaceImplementer(
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
    receiveCounter = receiveCounter + 1;
    console2.log(
      "tokensReceived - recipient contract, call count: %s, operator: %s, amount: %s",
      sendCounter,
      operator,
      amount
    );
    if (shouldAttackReceived) {
      if (receiveCounter == 2) {
        console2.log("Re-entry attempt from tokensReceived");
        lNori.withdrawTo(address(this), amount - 1);
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
    sendCounter = sendCounter + 1;
    console2.log(
      "tokensToSend - recipient contract, call count: %s, operator: %s, amount: %s",
      sendCounter,
      operator,
      amount
    );
    if (shouldAttackToSend) {
      if (msg.sender == address(lNori) && sendCounter < 2) {
        console2.log("Re-entry attempt from tokensToSend");
        lNori.withdrawTo(address(this), amount - 1);
      }
    }
  }
}

// https://tagmerge.com/issue/gakonst/foundry/693
contract LockedNORITest is Test, ERC777ERC1820 {
  address constant DEPOSITOR = address(0x10);
  address constant _ERC1820_REGISTRY_ADDRESS =
    0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24;
  address constant MUMBAI_CHILD_CHAIN_MANAGER_PROXY =
    0xb5505a6d998549090530911180f38aC5130101c6;
  uint256 constant SEED_AMOUNT = 1_000_000_000_000_000_000_000_000;
  uint256 constant GRANT_AMOUNT = 100_000_000_000_000_000;
  IERC1820RegistryUpgradeable registry;
  address admin = vm.addr(69);
  LockedNORIV2 lNori;
  MockERC777 erc777;
  MockERC20Permit erc20;
  LockedNORIV2Helper helper;
  PermitSigner signer;

  function issueGrant(address recipientAddress, uint256 fromTime) internal {
    uint256 amount = GRANT_AMOUNT;

    lNori.createGrant(
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
    erc20.approve(address(lNori), GRANT_AMOUNT);
    lNori.depositFor(recipientAddress, GRANT_AMOUNT);
  }

  function deployProxy(address _impl, bytes memory initializer)
    public
    returns (address)
  {
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
      _impl,
      admin,
      initializer
    );
    return address(proxy);
  }

  function deployLockedNORIV2(address _erc20) public returns (LockedNORIV2) {
    LockedNORIV2 impl = new LockedNORIV2();
    bytes memory initializer = abi.encodeWithSignature(
      "initialize(address)",
      _erc20
    );
    return LockedNORIV2(deployProxy(address(impl), initializer));
  }

  function deployMockERC20() public returns (MockERC20Permit) {
    MockERC20Permit impl = new MockERC20Permit();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC20Permit(deployProxy(address(impl), initializer));
  }

  function deployMockERC777() public returns (MockERC777) {
    MockERC777 impl = new MockERC777();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC777(deployProxy(address(impl), initializer));
  }

  function setUp() public {
    vm.etch(
      address(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24),
      bytes(
        hex"608060405234801561001057600080fd5b50600436106100a5576000357c010000000000000000000000000000000000000000000000000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b705676514610236578063f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a038135811691602081013591604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b50600160a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e0600480360360408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b6101086004803603604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e560020a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e204552433136352068617368000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b156104ff5760405160200180807f455243313832305f4143434550545f4d4147494300000000000000000000000081525060140190506040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a060020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a5750806105b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad82826108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a0390811660009081526020818152604080832086845290915290205416905092915050565b6000808061081d857f01ffc9a70000000000000000000000000000000000000000000000000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e060020a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b909250905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb83836107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160248189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2c4734c126b524e6c0029"
      )
    );
    // vm.etch(address(_ERC1820_REGISTRY_ADDRESS), newCode)
    // TODO:sw this should work too but it's getting the wrong bytecode
    // address regAddr = deployCode("ERC1820Registry.sol");
    registry = IERC1820RegistryUpgradeable(_ERC1820_REGISTRY_ADDRESS);
    registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensSender"),
      address(this)
    );
    registry.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensRecipient"),
      address(this)
    );

    erc777 = deployMockERC777();
    assertEq(erc777.balanceOf(address(this)), SEED_AMOUNT);

    erc20 = deployMockERC20();
    assertEq(erc20.balanceOf(address(this)), SEED_AMOUNT);

    lNori = deployLockedNORIV2(address(erc20));
    helper = new LockedNORIV2Helper();
    signer = new PermitSigner();
  }

  event Approval(address indexed owner, address indexed spender, uint256 value);

  function testBatchGrantCreation() public {
    address recipient = vm.addr(0xa11ce);
    uint256 grantAdminKey = 0xabcdef;
    address grantAdmin = vm.addr(grantAdminKey);
    erc20.transfer(grantAdmin, GRANT_AMOUNT);
    assertEq(erc20.balanceOf(address(grantAdmin)), GRANT_AMOUNT);
    lNori.grantRole(lNori.TOKEN_GRANTER_ROLE(), grantAdmin);

    uint256 deadline = 1 days;

    bytes memory params = helper.getSimpleGrantCreationParamsEncoded(
      recipient,
      1 days
    );
    vm.startPrank(grantAdmin);
    bytes32 digest = signer.digestPermitCall(
      address(erc20),
      address(lNori),
      GRANT_AMOUNT,
      deadline
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(grantAdminKey, digest);

    uint256[] memory amounts = new uint256[](1);
    amounts[0] = GRANT_AMOUNT;
    bytes[] memory data = new bytes[](1);
    data[0] = params;

    vm.expectEmit(true, true, true, false);
    emit Approval(address(grantAdmin), address(lNori), GRANT_AMOUNT);
    lNori.batchCreateGrants(amounts, data, deadline, v, r, s);

    helper.assertSimplePastGrant(address(lNori), lNori.getGrant(recipient));
    assertEq(erc20.balanceOf(grantAdmin), 0);
    assertEq(erc20.balanceOf(address(lNori)), GRANT_AMOUNT);

    assertEq(lNori.balanceOf(recipient), GRANT_AMOUNT);
    assertEq(lNori.vestedBalanceOf(recipient), 0);
    assertEq(lNori.unlockedBalanceOf(recipient), 0);

    vm.warp(3656 days);
    assertEq(lNori.balanceOf(recipient), GRANT_AMOUNT);
    assertEq(lNori.vestedBalanceOf(recipient), GRANT_AMOUNT);
    assertEq(lNori.unlockedBalanceOf(recipient), GRANT_AMOUNT);
  }

  function testTokensReceivedReverts() public {
    vm.expectRevert(
      "ERC777: token recipient contract has no implementer for ERC777TokensRecipient"
    );
    erc777.send(address(lNori), GRANT_AMOUNT, "");
  }

  function testReentryTokensReceived() public {
    Recipient recipient = new Recipient(address(lNori), true, false);
    issueGrant(address(recipient), 1 days);
    skip(100);

    uint256 balance = lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    vm.expectRevert("lNORI: insufficient balance");
    lNori.withdrawTo(address(recipient), balance);
  }

  function testReentryTokensToSend() public {
    Recipient recipient = new Recipient(address(lNori), false, true);
    issueGrant(address(recipient), 1 days);
    skip(100);

    uint256 balance = lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    vm.expectRevert("lNORI: insufficient balance");
    lNori.withdrawTo(address(recipient), balance);
  }

  function testNormalWithdrawal() public {
    Recipient recipient = new Recipient(address(lNori), false, false);
    issueGrant(address(recipient), 1 days);
    vm.warp(366 days);

    uint256 balance = lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    lNori.withdrawTo(address(recipient), balance);
    assertEq(lNori.unlockedBalanceOf(address(recipient)), 0);
    assertEq(erc20.balanceOf(address(recipient)), GRANT_AMOUNT);
  }
}
