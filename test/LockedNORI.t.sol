pragma solidity 0.8.15;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "../contracts/test/TestToken777.sol";
import "../contracts/deprecated/LockedNORI.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC1820RegistryUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";

abstract contract ERC777ERC1820 is
  IERC777RecipientUpgradeable,
  IERC777SenderUpgradeable
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
  LockedNORI lNori;
  TestToken777 bpNori;

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
    lNori = LockedNORI(lNoriAddress);
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
  uint256 constant SEED_AMOUNT = 1_000_000_000_000_000_000;
  uint256 constant GRANT_AMOUNT = 100_000_000_000_000_000;
  IERC1820RegistryUpgradeable registry;
  LockedNORI lNori;
  TestToken777 bpNori;

  function issueGrant(address recipientAddress) internal {
    address recipient = address(lNori);
    uint256 amount = GRANT_AMOUNT;
    bytes operatorData = bytes("");
    bool ack = true;

    bytes memory grantData = abi.encode(
      address(recipientAddress),
      block.timestamp,
      block.timestamp,
      block.timestamp + 100,
      block.timestamp,
      block.timestamp,
      0,
      0,
      0,
      0
    );
    bpNori.send(recipient, amount, grantData, operatorData, ack);
  }

  function setUp() public {
    // vm.etch(address(_ERC1820_REGISTRY_ADDRESS), bytes(hex"0x608060405234801561001057600080fd5b5061092e806100206000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063a41e7d511161005b578063a41e7d5114610106578063aabbb8ca14610119578063b70567651461012c578063f712f3e81461014f57600080fd5b806329965a1d1461008d5780633d584063146100a25780635df8122f146100d257806365ba36c1146100e5575b600080fd5b6100a061009b36600461075e565b610162565b005b6100b56100b036600461079a565b6103ae565b6040516001600160a01b0390911681526020015b60405180910390f35b6100a06100e03660046107bc565b6103f7565b6100f86100f33660046107ef565b6104cb565b6040519081526020016100c9565b6100a0610114366004610861565b6104ff565b6100b56101273660046108a5565b61057c565b61013f61013a366004610861565b6105f3565b60405190151581526020016100c9565b61013f61015d366004610861565b610695565b60006001600160a01b03841615610179578361017b565b335b905033610187826103ae565b6001600160a01b0316146101d45760405162461bcd60e51b815260206004820152600f60248201526e2737ba103a34329036b0b730b3b2b960891b60448201526064015b60405180910390fd5b6001600160e01b03831661022a5760405162461bcd60e51b815260206004820152601a60248201527f4d757374206e6f7420626520616e20455243313635206861736800000000000060448201526064016101cb565b6001600160a01b0382161580159061024b57506001600160a01b0382163314155b1561034a5760405173455243313832305f4143434550545f4d4147494360601b602082015260340160408051601f1981840301815290829052805160209091012063124e59fd60e11b8252600482018590526001600160a01b03838116602484015290919084169063249cb3fa90604401602060405180830381865afa1580156102d9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102fd91906108cf565b1461034a5760405162461bcd60e51b815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e7465726661636560448201526064016101cb565b6001600160a01b0381811660008181526020818152604080832088845290915280822080546001600160a01b0319169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b6001600160a01b038181166000908152600160205260408120549091166103d3575090565b506001600160a01b039081166000908152600160205260409020541690565b919050565b33610401836103ae565b6001600160a01b0316146104495760405162461bcd60e51b815260206004820152600f60248201526e2737ba103a34329036b0b730b3b2b960891b60448201526064016101cb565b816001600160a01b0316816001600160a01b031614610468578061046b565b60005b6001600160a01b0383811660008181526001602052604080822080546001600160a01b0319169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020016104e09291906108e8565b6040516020818303038152906040528051906020012090505b92915050565b61050982826105f3565b610514576000610516565b815b6001600160a01b039283166000818152602081815260408083206001600160e01b03199690961680845295825280832080546001600160a01b0319169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b6000806001600160a01b038416156105945783610596565b335b90506001600160e01b0383166105c757826105b18282610695565b6105bc5760006105be565b815b925050506104f9565b6001600160a01b0390811660009081526020818152604080832086845290915290205416905092915050565b60008080610608856301ffc9a760e01b610713565b9092509050811580610618575080155b15610628576000925050506104f9565b61063a856001600160e01b0319610713565b909250905081158061064b57508015155b1561065b576000925050506104f9565b6106658585610713565b909250905060018214801561067a5750806001145b1561068a576001925050506104f9565b506000949350505050565b6001600160a01b03821660009081526002602090815260408083206001600160e01b03198516845290915281205460ff166106db576106d483836105f3565b90506104f9565b506001600160a01b038083166000818152602081815260408083206001600160e01b0319871684529091529020549091161492915050565b6040516301ffc9a760e01b8082526004820183905260009182919060208160248189617530fa905190969095509350505050565b80356001600160a01b03811681146103f257600080fd5b60008060006060848603121561077357600080fd5b61077c84610747565b92506020840135915061079160408501610747565b90509250925092565b6000602082840312156107ac57600080fd5b6107b582610747565b9392505050565b600080604083850312156107cf57600080fd5b6107d883610747565b91506107e660208401610747565b90509250929050565b6000806020838503121561080257600080fd5b823567ffffffffffffffff8082111561081a57600080fd5b818501915085601f83011261082e57600080fd5b81358181111561083d57600080fd5b86602082850101111561084f57600080fd5b60209290920196919550909350505050565b6000806040838503121561087457600080fd5b61087d83610747565b915060208301356001600160e01b03198116811461089a57600080fd5b809150509250929050565b600080604083850312156108b857600080fd5b6108c183610747565b946020939093013593505050565b6000602082840312156108e157600080fd5b5051919050565b818382376000910190815291905056fea26469706673582212203bf34f1b29e8b341e2e7d55a1652376b3239e93daf632965db1389fab317261464736f6c634300080d0033"),
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

    bpNori = new TestToken777();
    bpNori.initialize(MUMBAI_CHILD_CHAIN_MANAGER_PROXY);
    bpNori.grantRole(bpNori.DEPOSITOR_ROLE(), address(this));

    lNori = new LockedNORI();
    lNori.initialize(bpNori);

    bpNori.deposit(address(this), abi.encode(SEED_AMOUNT));
    assertEq(bpNori.balanceOf(address(this)), SEED_AMOUNT);
  }

  function testReentryTokensReceived() public {
    Recipient recipient = new Recipient(address(lNori), true, false);
    issueGrant(address(recipient));
    skip(100);

    uint256 balance = lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    vm.expectRevert("lNORI: insufficient balance");
    lNori.withdrawTo(address(recipient), balance);
  }

  function testReentryTokensToSend() public {
    Recipient recipient = new Recipient(address(lNori), false, true);
    issueGrant(address(recipient));
    skip(100);

    uint256 balance = lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    vm.expectRevert("lNORI: insufficient balance");
    lNori.withdrawTo(address(recipient), balance);
  }

  function testNormalWithdrawl() public {
    Recipient recipient = new Recipient(address(lNori), false, false);
    issueGrant(address(recipient));
    skip(100);

    uint256 balance = lNori.unlockedBalanceOf(address(recipient));
    console2.log("Unlocked balance is: ", balance);
    vm.prank(address(recipient));
    lNori.withdrawTo(address(recipient), balance);
    assertEq(lNori.unlockedBalanceOf(address(recipient)), 0);
    assertEq(bpNori.balanceOf(address(recipient)), GRANT_AMOUNT);
  }
}
