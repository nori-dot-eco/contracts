/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";
import "@/test/helpers/removal.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@/contracts/test/MockERC20Permit.sol";
import "@/contracts/ArrayLib.sol";
import "@/contracts/Removal.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "@/contracts/test/MockERC20Permit.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];
using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

abstract contract MarketBalanceTestHelper is UpgradeableMarket {
  uint256[] internal _removalIds;
  address[] internal _suppliers;
  uint256[] internal _expectedRemovalBalances;
  uint256 internal _expectedMarketSupply;
  uint256 internal _amountPerRemoval = 1 ether;
  uint256 internal _expectedPriorityRestrictedThreshold;
  EnumerableMapUpgradeable.AddressToUintMap internal _expectedTokenCount;

  function _assertCorrectStates() internal {
    assertEq(
      _removal.balanceOfBatch(_suppliers, _removalIds),
      _expectedRemovalBalances,
      "Expected _removal.balanceOfBatch(_suppliers, _removalIds) to equal _expectedRemovalBalances"
    );
    assertEq(
      _availableMarketSupply(_removalIds),
      _expectedMarketSupply,
      "Expected availableSupply to equal _expectedMarketSupply"
    );
    assertEq(
      _market.getPriorityRestrictedThreshold(),
      _expectedPriorityRestrictedThreshold,
      "Expected availableSupply to equal _expectedMarketSupply"
    );
    for (uint256 i; i < _expectedTokenCount.length(); ++i) {
      (address owner, uint256 count) = _expectedTokenCount.at(i);
      assertEq(
        _removal.numberOfTokensOwnedByAddress(owner),
        count,
        string.concat(
          "Expected number of tokens owned by ",
          StringsUpgradeable.toHexString(owner),
          " to equal _expectedNumberOfTokensForMarket"
        )
      );
    }
  }
}

contract ERC1155Recipient {
  constructor() {}

  function onERC1155Received(
    address,
    address from,
    uint256,
    uint256,
    bytes calldata
  ) external returns (bytes4) {
    if (from == address(0)) {
      revert("Griefing attack!!!");
    }
  }
}

contract MarketReplaceTestHelper is UpgradeableMarket {
  uint256[] internal _removalIds;
  uint256 internal _certificateTokenId; // 0
  uint256 internal _amountToReplace = 0.5 ether;

  event UpdateCertificate(
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] amounts,
    address purchasingTokenAddress,
    uint256 priceMultiple
  );

  function _listRemovals() internal {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 2,
      list: true
    });
  }

  function _createCertificate() internal {
    // purchase a certificate and use up one removal
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 amount = _market.calculateCheckoutTotal(1 ether);
    uint256 certificateAmount = _market
      .calculateCertificateAmountFromPurchaseTotal(amount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    assertEq(_removal.getMarketBalance(), 2 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 2);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      amount,
      1 days,
      _bpNori
    );
    vm.prank(owner);
    _market.swap(
      owner,
      owner,
      amount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 1); // 1 removal left in stock that we will use to replace
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }

  function _assertExpectedBalances(
    address owner,
    uint256 amount,
    bool ownsRemovalTokenId,
    uint256 count
  ) internal {
    assertEq(
      _removal.balanceOf({account: owner, id: _removalIds[0]}),
      ownsRemovalTokenId ? amount : 0
    );
    assertEq(_removal.numberOfTokensOwnedByAddress(owner), count);
  }
}

contract Market_replace is MarketReplaceTestHelper {
  function setUp() external {
    _listRemovals();
    _createCertificate();

    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.admin
    });
    uint256 amount = _market.calculateCheckoutTotal(_amountToReplace);
    vm.startPrank(_namedAccounts.admin);

    _bpNori.deposit(_namedAccounts.admin, abi.encode(amount));
    _bpNori.approve(address(_market), amount);
  }

  function test() external {
    vm.expectEmit(true, false, false, true);
    emit UpdateCertificate(
      _certificateTokenId,
      new uint256[](1).fill(_removalIds[1]),
      new uint256[](1).fill(_amountToReplace),
      address(_bpNori),
      _market.getPriceMultiple()
    );
    _market.replace({
      treasury: _namedAccounts.admin,
      certificateId: _certificateTokenId,
      totalAmountToReplace: _amountToReplace,
      removalIdsBeingReplaced: new uint256[](1).fill(_removalIds[1]),
      removalAmountsBeingReplaced: new uint256[](1).fill(_amountToReplace)
    });
    vm.stopPrank();
  }
}

contract Market_swap_emits_event_and_skips_mint_when_minting_rNori_to_nonERC1155Receiver is
  UpgradeableMarket
{
  address owner;
  uint256 holdbackPercentage = 10;
  uint256 checkoutTotal;
  uint256 rNoriToMint;
  SignedPermit signedPermit;
  uint256 removalId;
  ERC1155Recipient recipient = new ERC1155Recipient();

  event RestrictedNORIMintFailure(
    uint256 indexed amount,
    uint256 indexed removalId
  );

  function setUp() external {
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](1);
    removals[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: address(recipient), // will not accept 1155 tokens - revert on mint
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier
    });

    removalId = RemovalIdLib.createRemovalId(removals[0]);

    _removal.mintBatch(
      address(_market),
      new uint256[](1).fill(2 ether),
      removals,
      1_234_567_890,
      block.timestamp,
      uint8(holdbackPercentage)
    );
    uint256 numberOfNRTsToPurchase = 1 ether;
    uint256 ownerPrivateKey = 0xA11CE;
    owner = vm.addr(ownerPrivateKey);
    checkoutTotal = _market.calculateCheckoutTotal(numberOfNRTsToPurchase);
    uint256 noriFeeAmount = _market.calculateNoriFee(numberOfNRTsToPurchase);
    rNoriToMint = ((checkoutTotal - noriFeeAmount) * holdbackPercentage) / 100;
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal));

    signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
  }

  function test() external {
    vm.prank(owner);
    vm.expectEmit(true, true, false, false);
    emit RestrictedNORIMintFailure(rNoriToMint, removalId);
    _market.swap(
      owner,
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
  }
}

contract Market_swap_emits_and_skips_transfer_when_transferring_wrong_erc20_to_rNori is
  UpgradeableMarket
{
  uint8 holdbackPercentage = 10;
  uint256 checkoutTotal;
  uint256 rNoriToMint;
  SignedPermit signedPermit;
  uint256[] _removalIds;
  uint256 removalId;
  MockERC20Permit internal _erc20;
  SignatureUtils internal _mockERC20SignatureUtils;
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 amount;
  uint256 fee;
  uint256 certificateAmount;

  bytes32 constant RNORI_ERC20_TRANSFER_SKIPPED_EVENT_SELECTOR =
    keccak256(
      "SkipRestrictedNORIERC20Transfer(uint256,uint256,uint256,address,address)"
    );

  event SkipRestrictedNORIERC20Transfer(
    uint256 indexed amount,
    uint256 indexed removalId,
    uint256 currentHoldbackPercentage,
    address rNoriUnderlyingToken,
    address purchasingTokenAddress
  );

  function _deployMockERC20() internal returns (MockERC20Permit) {
    MockERC20Permit impl = new MockERC20Permit();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC20Permit(_deployProxy(address(impl), initializer));
  }

  function setUp() external {
    _erc20 = _deployMockERC20();
    _mockERC20SignatureUtils = new SignatureUtils(_erc20.DOMAIN_SEPARATOR());
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: _erc20,
      priceMultiple: 2000
    });
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      holdbackPercentage: holdbackPercentage
    });

    uint256 numberOfNRTsToPurchase = 1 ether;
    checkoutTotal = _market.calculateCheckoutTotal(numberOfNRTsToPurchase);
    fee = _market.calculateNoriFee(numberOfNRTsToPurchase);
    rNoriToMint = ((checkoutTotal - fee) * holdbackPercentage) / 100;
    _erc20.transfer(owner, checkoutTotal);
    signedPermit = _mockERC20SignatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _erc20
    );
  }

  function test() external {
    vm.startPrank(owner);
    vm.recordLogs();
    _market.swap(
      owner,
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    vm.stopPrank();
    Vm.Log[] memory entries = vm.getRecordedLogs();
    bool containsTransferSkippedEventSelector = false;
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == RNORI_ERC20_TRANSFER_SKIPPED_EVENT_SELECTOR) {
        containsTransferSkippedEventSelector = true;
        assertEq(entries[i].topics[1], bytes32(uint256(rNoriToMint)));
        assertEq(entries[i].topics[2], bytes32(uint256(_removalIds[0])));
        (
          uint256 currentHoldbackPercentage,
          address rNoriUnderlyingToken,
          address purchasingTokenAddress
        ) = abi.decode(entries[i].data, (uint256, address, address));
        assertEq(currentHoldbackPercentage, holdbackPercentage);
        assertEq(rNoriUnderlyingToken, address(_bpNori));
        assertEq(purchasingTokenAddress, address(_erc20));
      }
    }
    assertEq(containsTransferSkippedEventSelector, true);
    assertEq(_erc20.balanceOf(owner), 0);
    assertEq(_erc20.balanceOf(_namedAccounts.supplier), checkoutTotal - fee);
    assertEq(_erc20.balanceOf(_market.getNoriFeeWallet()), fee);
    assertEq(_erc20.balanceOf(address(_rNori)), 0);
  }
}

contract Market_swapWithoutFee_emits_and_skips_transfer_when_transferring_wrong_erc20_to_rNori is
  UpgradeableMarket
{
  uint8 holdbackPercentage = 10;
  uint256 checkoutTotal;
  uint256 rNoriToMint;
  uint256[] _removalIds;
  MockERC20Permit internal _erc20;
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 amount;
  uint256 certificateAmount;

  bytes32 constant RNORI_ERC20_TRANSFER_SKIPPED_EVENT_SELECTOR =
    keccak256(
      "SkipRestrictedNORIERC20Transfer(uint256,uint256,uint256,address,address)"
    );

  event SkipRestrictedNORIERC20Transfer(
    uint256 indexed amount,
    uint256 indexed removalId,
    uint256 currentHoldbackPercentage,
    address rNoriUnderlyingToken,
    address purchasingTokenAddress
  );

  function _deployMockERC20() internal returns (MockERC20Permit) {
    MockERC20Permit impl = new MockERC20Permit();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC20Permit(_deployProxy(address(impl), initializer));
  }

  function setUp() external {
    _erc20 = _deployMockERC20();
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: _erc20,
      priceMultiple: 2000
    });
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      holdbackPercentage: holdbackPercentage
    });

    uint256 numberOfNRTsToPurchase = 1 ether;
    checkoutTotal = _market.calculateCheckoutTotalWithoutFee(
      numberOfNRTsToPurchase
    );
    rNoriToMint = (checkoutTotal * holdbackPercentage) / 100;
    _erc20.transfer(owner, checkoutTotal);
    vm.prank(owner);
    _erc20.approve(address(_market), MAX_INT); // infinite approval for Market to spend owner's tokens
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: owner});
  }

  function test() external {
    vm.startPrank(owner);
    vm.recordLogs();
    _market.swapWithoutFee(owner, owner, checkoutTotal);
    vm.stopPrank();
    Vm.Log[] memory entries = vm.getRecordedLogs();
    bool containsTransferSkippedEventSelector = false;
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == RNORI_ERC20_TRANSFER_SKIPPED_EVENT_SELECTOR) {
        containsTransferSkippedEventSelector = true;
        assertEq(entries[i].topics[1], bytes32(uint256(rNoriToMint)));
        assertEq(entries[i].topics[2], bytes32(uint256(_removalIds[0])));
        (
          uint256 currentHoldbackPercentage,
          address rNoriUnderlyingToken,
          address purchasingTokenAddress
        ) = abi.decode(entries[i].data, (uint256, address, address));
        assertEq(currentHoldbackPercentage, holdbackPercentage);
        assertEq(rNoriUnderlyingToken, address(_bpNori));
        assertEq(purchasingTokenAddress, address(_erc20));
      }
    }
    assertEq(containsTransferSkippedEventSelector, true);
    assertEq(_erc20.balanceOf(owner), 0);
    assertEq(_erc20.balanceOf(_namedAccounts.supplier), checkoutTotal);
    assertEq(_erc20.balanceOf(_market.getNoriFeeWallet()), 0);
    assertEq(_erc20.balanceOf(address(_rNori)), 0);
  }
}

contract Market_setNoriFeePercentage_revertsInvalidPercentage is
  UpgradeableMarket
{
  function test() external {
    vm.expectRevert(InvalidNoriFeePercentage.selector);
    _market.setNoriFeePercentage(150);
  }
}

contract Market_setPriorityRestrictedThreshold is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    _expectedPriorityRestrictedThreshold = 0.5 ether;
    _market.setPriorityRestrictedThreshold(
      _expectedPriorityRestrictedThreshold
    );
    _expectedMarketSupply =
      (_amountPerRemoval * _removalIds.length) -
      _expectedPriorityRestrictedThreshold;
    _assertCorrectStates();
  }

  function test_zeroAvailable() external {
    _expectedPriorityRestrictedThreshold =
      _amountPerRemoval *
      _removalIds.length;
    _market.setPriorityRestrictedThreshold(
      _expectedPriorityRestrictedThreshold
    );
    _expectedMarketSupply = 0;
    _assertCorrectStates();
  }
}

contract Market_withdraw_as_supplier is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates();
  }
}

contract Market_withdraw_as_operator is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: _amountPerRemoval
    });
    vm.prank(_namedAccounts.supplier);
    _removal.setApprovalForAll(_namedAccounts.supplier2, true);
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates(); // todo accept expected states as args instead
  }
}

contract Market_withdraw_as_DEFAULT_ADMIN_ROLE is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates();
  }
}

contract Market_withdraw_reverts is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    vm.expectRevert(UnauthorizedWithdrawal.selector);
    _market.withdraw(_removalIds[0]);
    _assertCorrectStates();
  }
}

contract Market_withdraw_1x3_center is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = new address[](3).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0, 0, 0];
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true
    });
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_front is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers, then relists */
contract Market_withdraw_2x1_front_relist is MarketBalanceTestHelper {
  function _assertListedState() internal {
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _assertListedState();
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }

  function test() external {
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: _amountPerRemoval
    });
    _assertListedState();
  }
}

/** @dev Test withdraw from the back of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_back is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(_namedAccounts.supplier2, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(_namedAccounts.supplier2, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  function test() external {
    assertEq(_market.ALLOWLIST_ROLE(), keccak256("ALLOWLIST_ROLE"));
  }
}

contract Market__isAuthorizedWithdrawal_true is NonUpgradeableMarket {
  function setUp() external {
    vm.store(
      address(this),
      bytes32(uint256(301)), // sets the _removal storage slot to the market contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
  }

  function test_returnsTrueWhenMsgSenderEqualsOwner() external {
    assertEq(_isAuthorizedWithdrawal({owner: _msgSender()}), true);
  }

  function test_returnsTrueWhenMsgSenderHasDefaultAdminRole() external {
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
    assertEq(_isAuthorizedWithdrawal({owner: _namedAccounts.supplier}), true);
  }

  function test_returnsTrueWhenMsgSenderIsApprovedForAll() external {
    vm.mockCall(
      address(this),
      abi.encodeWithSelector(IERC1155Upgradeable.isApprovedForAll.selector),
      abi.encode(true)
    );
    assertEq(_isAuthorizedWithdrawal({owner: address(0)}), true);
  }
}

contract Market__isAuthorizedWithdrawal_false is NonUpgradeableMarket {
  function setUp() external {
    vm.store(
      address(this),
      bytes32(uint256(301)), // sets the _removal storage slot to the market contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
    vm.mockCall(
      address(this),
      abi.encodeWithSelector(IERC1155Upgradeable.isApprovedForAll.selector),
      abi.encode(false)
    );
  }

  function test_returnsFalseWhenAllConditionsAreFalse() external {
    assertEq(_isAuthorizedWithdrawal({owner: _namedAccounts.supplier}), false);
  }
}

contract Market__validatePrioritySupply is NonUpgradeableMarket {
  function test_supplyAfterPurchaseIsLessThanPriorityRestrictedThreshold()
    external
    view
  {
    _validatePrioritySupply({
      purchaser: _namedAccounts.buyer,
      certificateAmount: 0.5 ether,
      availableSupply: 1 ether
    });
  }

  function test_supplyAfterPurchaseIsZero() external view {
    _validatePrioritySupply({
      purchaser: _namedAccounts.buyer,
      certificateAmount: 1 ether,
      availableSupply: 1 ether
    });
  }
}

contract Market__validatePrioritySupply_buyerIsAllowlistedAndAmountExceedsPriorityRestrictedThreshold is
  NonUpgradeableMarket
{
  function setUp() external {
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
    vm.prank(_msgSender());
    this.setPriorityRestrictedThreshold({threshold: 0.5 ether});
    _grantRole({role: ALLOWLIST_ROLE, account: _namedAccounts.deployer});
  }

  function test() external view {
    _validatePrioritySupply({
      purchaser: _namedAccounts.deployer,
      certificateAmount: 1 ether,
      availableSupply: 1 ether
    });
  }
}

contract Market__validatePrioritySupply_reverts_LowSupplyAllowlistRequired is
  NonUpgradeableMarket
{
  function setUp() external {
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
    vm.prank(_msgSender());
    this.setPriorityRestrictedThreshold({threshold: 1 ether});
  }

  function test() external {
    vm.expectRevert(LowSupplyAllowlistRequired.selector);
    _validatePrioritySupply({
      purchaser: _msgSender(),
      certificateAmount: 1 ether,
      availableSupply: 1 ether
    });
  }
}

contract Market__addActiveRemoval is NonUpgradeableMarket, UpgradeableRemoval {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  function test() external {
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
  }

  function test__list1VintageFor1Supplier() external {
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    address supplier = RemovalIdLib.supplierAddress(REMOVAL_ID_FIXTURE);
    uint256 earliestYear = _listedSupply[supplier].earliestYear;
    assertEq(earliestYear, REMOVAL_DATA_FIXTURE.vintage);
    assertEq(_listedSupply[supplier].latestYear, REMOVAL_DATA_FIXTURE.vintage);
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      supplier
    ].yearToRemovals[earliestYear];
    assertEq(yearToRemovals.length(), 1);
    assertEq(yearToRemovals.at(0), REMOVAL_ID_FIXTURE);
    assertEq(_suppliers[supplier].next, supplier);
    assertEq(_suppliers[supplier].previous, supplier);
  }

  function test__list2VintagesFor1SupplierFor1SubIdentifier() external {
    DecodedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.vintage = REMOVAL_DATA_FIXTURE.vintage + 1;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    _addActiveRemoval({removalId: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = secondRemovalsData.vintage;
    address supplier = RemovalIdLib.supplierAddress(secondRemovalsId);
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      supplier
    ].yearToRemovals[latestYear];
    assertEq(_listedSupply[supplier].earliestYear, earliestYear);
    assertEq(_listedSupply[supplier].latestYear, latestYear);
    assertEq(yearToRemovals.length(), 1);
    assertEq(yearToRemovals.at(0), secondRemovalsId);
    assertEq(_suppliers[supplier].next, supplier);
    assertEq(_suppliers[supplier].previous, supplier);
  }

  function test__lis2VintagesFor1SupplierFor2SubIdentifiers() external {
    DecodedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.subIdentifier = REMOVAL_DATA_FIXTURE.subIdentifier + 1;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    _addActiveRemoval({removalId: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = secondRemovalsData.vintage;
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      _namedAccounts.supplier
    ].yearToRemovals[latestYear];
    assertEq(_listedSupply[_namedAccounts.supplier].earliestYear, earliestYear);
    assertEq(_listedSupply[_namedAccounts.supplier].latestYear, latestYear);
    assertEq(yearToRemovals.length(), 2);
    assertEq(yearToRemovals.at(0), REMOVAL_ID_FIXTURE);
    assertEq(yearToRemovals.at(1), secondRemovalsId);
    assertEq(_suppliers[_namedAccounts.supplier].next, _namedAccounts.supplier);
    assertEq(
      _suppliers[_namedAccounts.supplier].previous,
      _namedAccounts.supplier
    );
  }

  function test__list1VintageFor2Suppliers() external {
    DecodedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.supplierAddress = _namedAccounts.supplier2;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    _addActiveRemoval({removalId: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = REMOVAL_DATA_FIXTURE.vintage;
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      _namedAccounts.supplier
    ].yearToRemovals[earliestYear];
    EnumerableSetUpgradeable.UintSet storage queueByVintage2 = _listedSupply[
      _namedAccounts.supplier2
    ].yearToRemovals[earliestYear];
    assertEq(_listedSupply[_namedAccounts.supplier].earliestYear, earliestYear);
    assertEq(_listedSupply[_namedAccounts.supplier].latestYear, latestYear);
    assertEq(
      _listedSupply[_namedAccounts.supplier2].earliestYear,
      earliestYear
    );
    assertEq(_listedSupply[_namedAccounts.supplier2].latestYear, latestYear);
    assertEq(yearToRemovals.length(), 1);
    assertEq(queueByVintage2.length(), 1);
    assertEq(yearToRemovals.at(0), REMOVAL_ID_FIXTURE);
    assertEq(queueByVintage2.at(0), secondRemovalsId);
    assertEq(
      _suppliers[_namedAccounts.supplier].next,
      _namedAccounts.supplier2
    );
    assertEq(
      _suppliers[_namedAccounts.supplier].previous,
      _namedAccounts.supplier2
    );
    assertEq(
      _suppliers[_namedAccounts.supplier2].next,
      _namedAccounts.supplier
    );
    assertEq(
      _suppliers[_namedAccounts.supplier2].previous,
      _namedAccounts.supplier
    );
  }
}

contract Market_onERC1155Received is UpgradeableMarket {
  function test() external {
    vm.prank(address(_removal));
    assertEq(
      _market.onERC1155Received(
        address(0),
        address(0),
        REMOVAL_ID_FIXTURE,
        uint256(1),
        ""
      ),
      IERC1155ReceiverUpgradeable.onERC1155Received.selector
    );
  }
}

contract Market_onERC1155Received_reverts_SenderNotRemovalContract is
  UpgradeableMarket
{
  NonUpgradeableRemoval private _unregisteredRemovalDuplicate;
  uint256[] private _removalIds;

  function setUp() external {
    _unregisteredRemovalDuplicate = new NonUpgradeableRemoval();
    _unregisteredRemovalDuplicate.grantRole(
      _unregisteredRemovalDuplicate.CONSIGNOR_ROLE(),
      address(this)
    );
    _marketAddress = address(_market);
    _unregisteredRemovalDuplicate.registerContractAddresses(
      Market(_market),
      Certificate(_certificate)
    );
    _rNori.registerContractAddresses(
      IERC20WithPermit(address(_bpNori)),
      Removal(_unregisteredRemovalDuplicate)
    );
    _rNori.grantRole(
      _rNori.SCHEDULE_CREATOR_ROLE(),
      address(_unregisteredRemovalDuplicate)
    );
    _removalIds = _unregisteredRemovalDuplicate.seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false,
      uniqueVintages: false
    });
  }

  function test() external {
    vm.expectRevert("Market: Sender not Removal");
    _unregisteredRemovalDuplicate.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: 1 ether
    });
  }
}

contract Market_onERC1155BatchReceived is UpgradeableMarket {
  function test() external {
    vm.prank(address(_removal));
    assertEq(
      _market.onERC1155BatchReceived(
        address(0),
        address(0),
        new uint256[](1).fill(REMOVAL_ID_FIXTURE),
        new uint256[](1).fill(1),
        ""
      ),
      IERC1155ReceiverUpgradeable.onERC1155BatchReceived.selector
    );
  }
}

contract Market_onERC1155BatchReceived_reverts_SenderNotRemovalContract is
  UpgradeableMarket
{
  NonUpgradeableRemoval private _unregisteredRemovalDuplicate;
  uint256[] private _removalIds;

  function setUp() external {
    _unregisteredRemovalDuplicate = new NonUpgradeableRemoval();
    _unregisteredRemovalDuplicate.grantRole(
      _unregisteredRemovalDuplicate.CONSIGNOR_ROLE(),
      address(this)
    );
    _marketAddress = address(_market);
    _unregisteredRemovalDuplicate.registerContractAddresses(
      Market(_market),
      Certificate(_certificate)
    );
    _rNori.registerContractAddresses(
      IERC20WithPermit(address(_bpNori)),
      Removal(_unregisteredRemovalDuplicate)
    );
    _rNori.grantRole(
      _rNori.SCHEDULE_CREATOR_ROLE(),
      address(_unregisteredRemovalDuplicate)
    );
  }

  function test() external {
    vm.expectRevert("Market: Sender not Removal");
    _removalIds = _unregisteredRemovalDuplicate.seedRemovals({
      to: address(_market),
      count: 2,
      list: false,
      uniqueVintages: false
    });
  }
}

contract Market__validateSupply is NonUpgradeableMarket, UpgradeableRemoval {
  function test() external pure {
    _validateSupply({certificateAmount: 1 ether, availableSupply: 1 ether});
  }

  function test_reverts_OutOfSupply() external {
    vm.expectRevert(InsufficientSupply.selector);
    _validateSupply({certificateAmount: 1 ether, availableSupply: 0.9 ether});
  }
}

contract Market__multicall_initialize_reverts is UpgradeableMarket {
  function test() external {
    bytes[] memory multicallArg = new bytes[](1);
    multicallArg[0] = (
      abi.encodeWithSelector(
        _market.initialize.selector,
        _removal,
        _bpNori,
        _certificate,
        _rNori,
        _namedAccounts.admin,
        15,
        100
      )
    );
    vm.expectRevert("Initializable: contract is already initialized");
    _market.multicall(multicallArg);
  }
}

contract Market__multicall_empty_bytes_reverts is UpgradeableMarket {
  function test() external {
    bytes[] memory multicallArg = new bytes[](1);
    vm.expectRevert("Address: low-level delegate call failed");
    _market.multicall(multicallArg);
  }
}

contract Market_getActiveSuppliers is UpgradeableMarket {
  uint256[] private _removalIds;

  function test_no_suppliers() external {
    assertEq(_market.getActiveSuppliers(), new address[](0));
  }

  function test_1_supplier() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    assertEq(
      _market.getActiveSuppliers(),
      new address[](1).fill(_namedAccounts.supplier)
    );
  }

  function test_3_suppliers() external {
    address[] memory expectedSuppliers = new address[](3);
    expectedSuppliers[0] = _namedAccounts.supplier;
    expectedSuppliers[1] = _namedAccounts.supplier2;
    expectedSuppliers[2] = _namedAccounts.supplier3;

    for (uint256 i = 0; i < expectedSuppliers.length; i++) {
      uint256[] memory localRemovalIds = _seedRemovals({
        to: expectedSuppliers[i],
        count: 1,
        list: true
      });
      _removalIds.push(localRemovalIds[0]);
    }
    assertEq(_market.getActiveSuppliers(), expectedSuppliers);
  }
}

contract Market_getRemovalIdsForSupplier is UpgradeableMarket {
  uint256[] private _removalIds;

  function test_no_removals() external {
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }

  function test_1_removal() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }

  function test_3_removals() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true
    });
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }

  function test_3_removals_different_vintages() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true,
      uniqueVintages: true
    });
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }
}

contract Market__setPurchasingToken is NonUpgradeableMarket {
  function test() external {
    vm.recordLogs();
    address erc20 = vm.addr(0xcab00d1e);
    IERC20WithPermit newPurchasingToken = IERC20WithPermit(erc20);
    _setPurchasingToken({purchasingToken: newPurchasingToken});
    Vm.Log[] memory entries = vm.getRecordedLogs();
    assertEq(entries.length, 1);
    assertEq(entries[0].topics[0], keccak256("SetPurchasingToken(address)"));
    address actualPurchasingToken = abi.decode(entries[0].data, (address));
    assertEq(
      abi.decode(entries[0].data, (address)),
      address(newPurchasingToken)
    );
  }
}

contract Market_purchasingTokenAddress is UpgradeableMarket {
  function test() external {
    assertEq(_market.getPurchasingTokenAddress(), address(_bpNori));
  }
}

contract Market__setPriceMultiple is NonUpgradeableMarket {
  function test() external {
    vm.recordLogs();
    uint256 newPriceMultiple = 20;
    _setPriceMultiple({priceMultiple: newPriceMultiple});
    Vm.Log[] memory entries = vm.getRecordedLogs();
    assertEq(entries.length, 1);
    assertEq(entries[0].topics[0], keccak256("SetPriceMultiple(uint256)"));
    assertEq(abi.decode(entries[0].data, (uint256)), newPriceMultiple);
  }
}

contract Market_getPriceMultiple is UpgradeableMarket {
  function test() external {
    assertEq(_market.getPriceMultiple(), 2000);
  }
}

contract Market_setPurchasingTokenAndPriceMultiple is UpgradeableMarket {
  function test() external {
    vm.recordLogs();
    address erc20 = vm.addr(0xcab00d1e);
    IERC20WithPermit newPurchasingToken = IERC20WithPermit(erc20);
    uint256 newPriceMultiple = 2000;
    _market.setPurchasingTokenAndPriceMultiple(
      newPurchasingToken,
      newPriceMultiple
    );
    Vm.Log[] memory entries = vm.getRecordedLogs();
    assertEq(entries.length, 2);
    assertEq(entries[0].topics[0], keccak256("SetPurchasingToken(address)"));
    assertEq(
      abi.decode(entries[0].data, (address)),
      address(newPurchasingToken)
    );
    assertEq(entries[1].topics[0], keccak256("SetPriceMultiple(uint256)"));
    assertEq(abi.decode(entries[1].data, (uint256)), newPriceMultiple);
  }
}

contract Market_setPurchasingTokenAndPriceMultiple_revertsIfNotAdmin is
  UpgradeableMarket
{
  function test() external {
    address nonAdmin = vm.addr(0xa11ce);
    vm.expectRevert(
      "AccessControl: account 0xe05fcc23807536bee418f142d19fa0d21bb0cff7 is missing role 0x3fb0aaa9e8051cfc6c234a5d843bed33910f70c647055f27247c10144c7552e1"
    );
    vm.prank(nonAdmin);
    _market.setPurchasingTokenAndPriceMultiple(IERC20WithPermit(address(0)), 0);
  }
}

contract Market_supplierSelectionUsingUpSuppliersLastRemoval is
  MarketBalanceTestHelper
{
  address owner;
  uint256 checkoutTotal;
  SignedPermit signedPermit;
  uint256[] removalIds;

  function setUp() external {
    removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier3, count: 1, list: true})[0]
    ];

    uint256 ownerPrivateKey = 0xA11CE;
    owner = vm.addr(ownerPrivateKey);
    checkoutTotal = _market.calculateCheckoutTotal(1.5 ether);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal));

    signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
  }

  function test() external {
    // each of the supplier has 1 removal with amount of 10**18 listed
    address[] memory expectedSuppliers = new address[](3);
    expectedSuppliers[0] = _namedAccounts.supplier;
    expectedSuppliers[1] = _namedAccounts.supplier2;
    expectedSuppliers[2] = _namedAccounts.supplier3;
    assertEq(_market.getActiveSuppliers(), expectedSuppliers);

    // purchase 1.5 * 10**18 amount of removals
    vm.prank(owner);
    _market.swap(
      owner,
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );

    // Entire amount (1 * 10**18) of 1st supplier was taken
    uint256 supplier1RemovalBalance = _removal.balanceOf(
      address(_market),
      removalIds[0]
    );
    assertEq(0, supplier1RemovalBalance);

    // 0.5 * 10**18 amount of 2nd supplier was taken
    uint256 supplier2RemovalBalance = _removal.balanceOf(
      address(_market),
      removalIds[1]
    );
    assertEq(0.5 ether, supplier2RemovalBalance);

    // Nothing of 3rd supplier was taken
    uint256 supplier3RemovalBalance = _removal.balanceOf(
      address(_market),
      removalIds[2]
    );
    assertEq(1 ether, supplier3RemovalBalance);
  }
}

contract MarketSupplierSelectionNotUsingUpSuppliersLastRemoval is
  MarketBalanceTestHelper
{
  address owner;
  uint256 checkoutTotal;
  SignedPermit signedPermit;
  uint256[] supplier1RemovalIds;
  uint256[] supplier2RemovalIds;

  function setUp() external {
    supplier1RemovalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 2,
      list: true
    });
    supplier2RemovalIds = _seedRemovals({
      to: _namedAccounts.supplier2,
      count: 1,
      list: true
    });

    uint256 ownerPrivateKey = 0xA11CE;
    owner = vm.addr(ownerPrivateKey);
    checkoutTotal = _market.calculateCheckoutTotal(1.5 ether);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal));

    signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
  }

  function test() external {
    // supplier1 has 2 removals with amount of 10**18 listed, supplier2 has 1 removal with amount of 10**18 listed
    address[] memory expectedSuppliers = new address[](2);
    expectedSuppliers[0] = _namedAccounts.supplier;
    expectedSuppliers[1] = _namedAccounts.supplier2;
    assertEq(_market.getActiveSuppliers(), expectedSuppliers);

    // purchase 1.5 * 10**18 amount of removals
    vm.prank(owner);
    _market.swap(
      owner,
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );

    // Entire amount (1 * 10**18) of 1st supplier's first removal was taken
    uint256 supplier1FirstRemovalBalance = _removal.balanceOf(
      address(_market),
      supplier1RemovalIds[0]
    );
    assertEq(0, supplier1FirstRemovalBalance);

    // Nothing of 1st supplier's second removal was taken
    uint256 supplier1SecondRemovalBalance = _removal.balanceOf(
      address(_market),
      supplier1RemovalIds[1]
    );
    assertEq(1 ether, supplier1SecondRemovalBalance);

    // 0.5 * 10**18 amount of 2nd supplier's removal was taken
    uint256 supplier2RemovalBalance = _removal.balanceOf(
      address(_market),
      supplier2RemovalIds[0]
    );
    assertEq(0.5 ether, supplier2RemovalBalance);
  }
}
