/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";
import "@/contracts/test/MockERC20Permit.sol";
import {DecodedRemovalIdV0} from "@/contracts/RemovalIdLib.sol";
import {AddressArrayLib, UInt256ArrayLib} from "@/contracts/ArrayLib.sol";

using AddressArrayLib for address[];
using UInt256ArrayLib for uint256[];

abstract contract Checkout is UpgradeableMarket {
  uint256[] internal _removalIds;
  uint256 internal _certificateTokenId;

  bytes32 constant CREATE_CERTIFICATE_EVENT_SELECTOR =
    keccak256(
      "CreateCertificate(address,address,uint256,uint256,uint256[],uint256[],address,uint256,uint256)"
    );

  function _deployMockERC20() internal returns (MockERC20Permit) {
    MockERC20Permit impl = new MockERC20Permit();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC20Permit(_deployProxy(address(impl), initializer));
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

contract Checkout_buyingFromOneRemoval is Checkout {
  uint256 private _ownerPrivateKey = 0xA11CE;
  address private _owner = vm.addr(_ownerPrivateKey);
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _amount = _market.calculateCheckoutTotal(_certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_amount));
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _signedPermit = _signatureUtils.generatePermit(
      _ownerPrivateKey,
      address(_market),
      _amount,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _owner);
  }

  function test() external {
    vm.prank(_owner);
    _market.swap(
      _owner,
      _certificateAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), _certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      _certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), _owner);
  }
}

contract Checkout_buyingFromOneRemoval_byApproval is Checkout {
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _amount = _market.calculateCheckoutTotal(_certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(_amount));
    vm.prank(_namedAccounts.buyer);
    _bpNori.approve(address(_market), MAX_INT);
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _namedAccounts.buyer);
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);
    _market.swap(_namedAccounts.buyer, _certificateAmount);
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), _certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      _certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), _namedAccounts.buyer);
  }
}

contract Checkout_swapRevertsWithDifferentPermitSignerAndMsgSender is Checkout {
  uint256 private _ownerPrivateKey = 0xA11CE;
  address private _owner = vm.addr(_ownerPrivateKey);
  address private _msgSender = vm.addr(0x12345);
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _amount = _market.calculateCheckoutTotal(_certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_amount));
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _signedPermit = _signatureUtils.generatePermit(
      _ownerPrivateKey,
      address(_market),
      _amount,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _owner);
  }

  function test() external {
    vm.expectRevert();
    _market.swap(
      _owner,
      _certificateAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
  }
}

contract Checkout_swapRevertsWhenBuyerIsMissingSANCTION_ALLOWLIST_ROLE is
  Checkout
{
  uint256 private _ownerPrivateKey = 0xA11CE;
  address private _owner = vm.addr(_ownerPrivateKey);
  address private _msgSender = vm.addr(0x12345);
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _amount = _market.calculateCheckoutTotal(_certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_amount));
    _signedPermit = _signatureUtils.generatePermit(
      _ownerPrivateKey,
      address(_market),
      _amount,
      1 days,
      _bpNori
    );
  }

  function test() external {
    vm.expectRevert();
    _market.swap(
      _owner,
      _certificateAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
  }
}

contract Checkout_buyingFromTenRemovals is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _expectedCertificateAmount = 10 ether;
    _purchaseAmount = _market.calculateCheckoutTotal(
      _expectedCertificateAmount
    );
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_owner);
    _signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      _purchaseAmount,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _owner);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
  }

  function test() external {
    vm.prank(_owner);
    _market.swap(
      _owner,
      _expectedCertificateAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_certificate)),
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _removal.getOwnedTokenIds(address(_certificate))[i],
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      _expectedCertificateAmount,
      "Certificate balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_withoutFee is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _expectedCertificateAmount = 10 ether;
    _purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
      amount: _expectedCertificateAmount,
      priceMultiple: _market.getPriceMultiple()
    });
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(_purchaseAmount));
    vm.prank(_namedAccounts.buyer);
    _bpNori.approve(address(_market), MAX_INT); // infinite approval for Market to spend owner's tokens
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      purchaser: _namedAccounts.buyer,
      amount: _expectedCertificateAmount,
      customFee: _market.getNoriFeePercentage(),
      customPriceMultiple: _market.getPriceMultiple(),
      supplier: address(0),
      vintages: new uint256[](0)
    });
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_certificate)),
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _removal.getOwnedTokenIds(address(_certificate))[i],
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      _expectedCertificateAmount,
      "Certificate balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _namedAccounts.buyer,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_singleSupplier is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _expectedCertificateAmount = 10 ether;
    _purchaseAmount = _market.calculateCheckoutTotal(
      _expectedCertificateAmount
    );
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(_purchaseAmount));
    vm.prank(_namedAccounts.buyer);
    _bpNori.approve(address(_market), MAX_INT);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      0,
      "Certificate balance is wrong"
    );
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      purchaser: _namedAccounts.buyer,
      amount: _expectedCertificateAmount,
      customFee: _market.getNoriFeePercentage(),
      customPriceMultiple: _market.getPriceMultiple(),
      supplier: _namedAccounts.supplier,
      vintages: new uint256[](0)
    });
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_certificate)),
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _removal.getOwnedTokenIds(address(_certificate))[i],
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      _expectedCertificateAmount,
      "Certificate balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _namedAccounts.buyer,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_singleSupplier_withoutFee is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _expectedCertificateAmount = 10 ether;
    _purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
      amount: _expectedCertificateAmount,
      priceMultiple: _market.getPriceMultiple()
    });
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(_purchaseAmount));
    vm.prank(_namedAccounts.buyer);
    _bpNori.approve(address(_market), MAX_INT);
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_namedAccounts.buyer);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      0,
      "Certificate balance is wrong"
    );
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);

    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      purchaser: _namedAccounts.buyer,
      amount: _expectedCertificateAmount,
      customFee: _market.getNoriFeePercentage(),
      customPriceMultiple: _market.getPriceMultiple(),
      supplier: _namedAccounts.supplier,
      vintages: new uint256[](0)
    });
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_certificate)),
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _removal.getOwnedTokenIds(address(_certificate))[i],
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      _expectedCertificateAmount,
      "Certificate balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _namedAccounts.buyer,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenSuppliers is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;

  function setUp() external {
    for (uint256 i = 0; i < 10; i++) {
      uint256[] memory localRemovalIds = _seedRemovals({
        to: vm.addr(i + 1), // unique, arbitrary supplier address for each removal (pk can't be 0)
        count: 1,
        list: true
      });
      _removalIds.push(localRemovalIds[0]);
    }
    _expectedCertificateAmount = 10 ether;
    _purchaseAmount = _market.calculateCheckoutTotal(
      _expectedCertificateAmount
    );
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_owner);
    _signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      _purchaseAmount,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _owner);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      0,
      "Certificate balance is wrong"
    );
  }

  function test() external {
    vm.prank(_owner);
    _market.swap(
      _owner,
      _expectedCertificateAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    // _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_certificate)),
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _removal.getOwnedTokenIds(address(_certificate))[i],
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      _expectedCertificateAmount,
      "Certificate balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingWithAlternateERC20 is Checkout {
  MockERC20Permit internal _erc20;
  SignatureUtils internal _mockERC20SignatureUtils;
  uint256 private _deadline = 1 days;
  uint256 private _ownerPrivateKey = 0xA11CE;
  address private _owner = vm.addr(_ownerPrivateKey);
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;
  uint256 private _fee;

  function setUp() external {
    _erc20 = _deployMockERC20();

    _mockERC20SignatureUtils = new SignatureUtils();
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: _erc20,
      priceMultiple: 2000
    });
    assertEq(_market.getPurchasingTokenAddress(), address(_erc20));
    _amount = _market.calculateCheckoutTotal(_certificateAmount);
    _fee = _market.calculateNoriFee(_certificateAmount);
    _erc20.transfer(_owner, _amount);
    assertEq(_erc20.balanceOf(address(_owner)), _amount);
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      holdbackPercentage: 0
    });
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _owner);
  }

  function test() external {
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    SignedPermit memory signedPermit = _mockERC20SignatureUtils.generatePermit(
      _ownerPrivateKey,
      address(_market),
      _amount,
      1 days,
      _erc20
    );
    vm.recordLogs();
    vm.prank(_owner);
    _market.swap(
      _owner,
      _certificateAmount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );

    Vm.Log[] memory entries = vm.getRecordedLogs();
    bool containsCreateCertificateEventSelector = false;
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == CREATE_CERTIFICATE_EVENT_SELECTOR) {
        containsCreateCertificateEventSelector = true;
        assertEq(
          entries[i].topics[1],
          bytes32(uint256(uint160(address(_owner))))
        );
        assertEq(entries[i].topics[2], bytes32(uint256(uint256(0))));
        assertEq(
          entries[i].topics[3],
          bytes32(uint256(uint160(address(_erc20))))
        );
        (
          address from,
          uint256 eventCertificateAmount,
          uint256[] memory removalIds,
          uint256[] memory removalAmounts,
          uint256 priceMultiple,
          uint256 noriFeePercentage
        ) = abi.decode(
            entries[i].data,
            (address, uint256, uint256[], uint256[], uint256, uint256)
          );
        assertEq(from, address(_removal));
        assertEq(eventCertificateAmount, _certificateAmount);
        assertEq(priceMultiple, _market.getPriceMultiple());
        assertEq(noriFeePercentage, _market.getNoriFeePercentage());
        assertEq(removalIds.length, 1);
        assertEq(removalAmounts.length, 1);
        assertEq(removalIds[0], _removalIds[0]);
        assertEq(removalAmounts[0], _certificateAmount);
      }
    }
    assertEq(containsCreateCertificateEventSelector, true);
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), _certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      _certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), _owner);
    assertEq(_erc20.balanceOf(address(_owner)), 0);
    assertEq(_erc20.balanceOf(_namedAccounts.supplier), _amount - _fee);
    assertEq(_erc20.balanceOf(_market.getNoriFeeWallet()), _fee);
  }
}

contract Checkout_buyingWithAlternateERC20_floatingPointPriceMultiple is
  Checkout
{
  MockERC20Permit internal _erc20;
  SignatureUtils internal _mockERC20SignatureUtils;
  uint256 private _deadline = 1 days;
  uint256 private _ownerPrivateKey = 0xA11CE;
  address private _owner = vm.addr(_ownerPrivateKey);
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;
  uint256 private _fee;
  SignedPermit private _signedPermit;

  function setUp() external {
    _erc20 = _deployMockERC20();

    _mockERC20SignatureUtils = new SignatureUtils();
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: _erc20,
      priceMultiple: 1995 // $19.95
    });
    assertEq(_market.getPurchasingTokenAddress(), address(_erc20));
    _amount = _market.calculateCheckoutTotal(_certificateAmount);
    _fee = _market.calculateNoriFee(_certificateAmount);
    _erc20.transfer(_owner, _amount);
    assertEq(_erc20.balanceOf(address(_owner)), _amount);
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      holdbackPercentage: 0
    });
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _signedPermit = _mockERC20SignatureUtils.generatePermit(
      _ownerPrivateKey,
      address(_market),
      _amount,
      1 days,
      _erc20
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), _owner);
  }

  function test() external {
    vm.recordLogs();
    vm.prank(_owner);
    _market.swap(
      _owner,
      _certificateAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    Vm.Log[] memory entries = vm.getRecordedLogs();
    bool containsCreateCertificateEventSelector = false;
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == CREATE_CERTIFICATE_EVENT_SELECTOR) {
        containsCreateCertificateEventSelector = true;
        assertEq(
          entries[i].topics[1],
          bytes32(uint256(uint160(address(_owner))))
        );
        assertEq(entries[i].topics[2], bytes32(uint256(uint256(0))));
        assertEq(
          entries[i].topics[3],
          bytes32(uint256(uint160(address(_erc20))))
        );
        (
          address from,
          uint256 eventCertificateAmount,
          uint256[] memory removalIds,
          uint256[] memory removalAmounts,
          uint256 priceMultiple,
          uint256 noriFeePercentage
        ) = abi.decode(
            entries[i].data,
            (address, uint256, uint256[], uint256[], uint256, uint256)
          );
        assertEq(from, address(_removal));
        assertEq(eventCertificateAmount, _certificateAmount);
        assertEq(priceMultiple, _market.getPriceMultiple());
        assertEq(noriFeePercentage, _market.getNoriFeePercentage());
        assertEq(removalIds.length, 1);
        assertEq(removalAmounts.length, 1);
        assertEq(removalIds[0], _removalIds[0]);
        assertEq(removalAmounts[0], _certificateAmount);
      }
    }
    assertEq(containsCreateCertificateEventSelector, true);
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), _certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      _certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), _owner);
    assertEq(_erc20.balanceOf(address(_owner)), 0);
    assertEq(_erc20.balanceOf(_namedAccounts.supplier), _amount - _fee);
    assertEq(_erc20.balanceOf(_market.getNoriFeeWallet()), _fee);
  }
}

// contract Checkout_swapWithoutFeeSpecialOrder is Checkout {
//   uint256 private _customFee = 5;
//   uint256 private _certificateAmount = 1 ether;
//   uint256 private _customPriceMultiple = 1800; // $18.00 -- test below the default price multiple of $20.00
//   uint256[] private _vintages = new uint256[](0);
//   uint256 private _holdbackPercentage = 0;
//   uint256 private _priceMultipleScale = 100;

//   function setUp() external {
//     _removalIds = _seedRemovals({
//       to: _namedAccounts.supplier,
//       count: 1,
//       list: true
//     });
//     uint256 purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
//       amount: _certificateAmount,
//       priceMultiple: _customPriceMultiple
//     });
//     _market.grantRole({
//       role: _market.MARKET_ADMIN_ROLE(),
//       account: _namedAccounts.buyer
//     });
//     vm.prank(_namedAccounts.admin);
//     _bpNori.deposit(_namedAccounts.buyer, abi.encode(purchaseAmount));
//     vm.prank(_namedAccounts.buyer);
//     _bpNori.approve(address(_market), purchaseAmount);
//   }

//   function test() external {
//     vm.prank(_namedAccounts.buyer);
//     vm.recordLogs();
//     _market.swapWithoutFeeSpecialOrder({
//       recipient: _namedAccounts.buyer,
//       purchaser: _namedAccounts.buyer,
//       amount: _certificateAmount,
//       customFee: _customFee,
//       customPriceMultiple: _customPriceMultiple,
//       supplier: address(0),
//       vintages: _vintages
//     });

//     Vm.Log[] memory entries = vm.getRecordedLogs();
//     uint256 createCertificateEventIndex;
//     for (uint256 i = 0; i < entries.length; ++i) {
//       if (entries[i].topics[0] == CREATE_CERTIFICATE_EVENT_SELECTOR) {
//         createCertificateEventIndex = i;
//         break;
//       }
//     }
//     assertEq(
//       entries[createCertificateEventIndex].topics[0],
//       CREATE_CERTIFICATE_EVENT_SELECTOR
//     );
//     assertEq(
//       entries[createCertificateEventIndex].topics[1],
//       bytes32(uint256(uint160(address(_namedAccounts.buyer))))
//     );
//     assertEq(
//       entries[createCertificateEventIndex].topics[2],
//       bytes32(uint256(uint256(0)))
//     );
//     assertEq(
//       entries[createCertificateEventIndex].topics[3],
//       bytes32(uint256(uint160(address(_bpNori))))
//     );
//     (
//       address from,
//       uint256 eventCertificateAmount,
//       uint256[] memory removalIds,
//       uint256[] memory removalAmounts,
//       uint256 priceMultiple,
//       uint256 noriFeePercentage
//     ) = abi.decode(
//         entries[createCertificateEventIndex].data,
//         (address, uint256, uint256[], uint256[], uint256, uint256)
//       );
//     assertEq(from, address(_removal));
//     assertEq(eventCertificateAmount, _certificateAmount);
//     assertEq(priceMultiple, _customPriceMultiple);
//     assertEq(noriFeePercentage, _customFee);
//     assertEq(removalIds.length, 1);
//     assertEq(removalAmounts.length, 1);
//     assertEq(removalIds[0], _removalIds[0]);
//     assertEq(removalAmounts[0], _certificateAmount);
//     assertEq(
//       _bpNori.balanceOf(_namedAccounts.supplier),
//       ((_certificateAmount * _customPriceMultiple) * _holdbackPercentage) /
//         _priceMultipleScale /
//         100
//     );
//     assertEq(_bpNori.balanceOf(_namedAccounts.feeWallet), 0);
//   }
// }

contract Checkout_swapWithoutFeeSpecialOrder_specificVintages is Checkout {
  uint256 private _customFee = 5;
  uint256 private _certificateAmount = 2.5 ether;
  uint256[] private _vintages = [2019, 2020];
  uint256 private _priceMultiple = 2000;
  uint256[] private _expectedRemovalAmounts;

  function setUp() external {
    /**
     * Supplier 1: 2018 vintage
     * Supplier 2: 2018, 2019 and 2020 vintage
     * Supplier 3: 2019 vintage
     * All removals are 1 tonne
     * Certificate amount is 2.5 tonnes
     * Fulfillment should result in all of supplier2's removals being used, and .5 tonne of supplier3's removals
     */
    _expectedRemovalAmounts.push(1 ether);
    _expectedRemovalAmounts.push(1 ether);
    _expectedRemovalAmounts.push(0.5 ether);
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier,
        amount: 1 ether,
        vintage: 2018
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier2,
        amount: 1 ether,
        vintage: 2018
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier2,
        amount: 1 ether,
        vintage: 2019
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier2,
        amount: 1 ether,
        vintage: 2020
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier3,
        amount: 1 ether,
        vintage: 2019
      })
    );
    uint256 purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
      amount: _certificateAmount,
      priceMultiple: _priceMultiple
    });
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(purchaseAmount));
    vm.prank(_namedAccounts.buyer);
    _bpNori.approve(address(_market), purchaseAmount);
  }

  function test_basicFulfillment() external {
    vm.prank(_namedAccounts.buyer);
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder(
      _namedAccounts.buyer,
      _namedAccounts.buyer,
      _certificateAmount,
      _customFee,
      _priceMultiple,
      address(0),
      _vintages
    );

    Vm.Log[] memory entries = vm.getRecordedLogs();
    // In this test scenario, the `CreateCertificate` event index is 18 because multiple suppliers are getting
    // paid so we use the event selector to find the event index.
    uint256 createCertificateEventIndex;
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == CREATE_CERTIFICATE_EVENT_SELECTOR) {
        createCertificateEventIndex = i;
        break;
      }
    }
    assertEq(
      entries[createCertificateEventIndex].topics[0],
      CREATE_CERTIFICATE_EVENT_SELECTOR
    );
    assertEq(
      entries[createCertificateEventIndex].topics[1],
      bytes32(uint256(uint160(address(_namedAccounts.buyer))))
    );
    assertEq(
      entries[createCertificateEventIndex].topics[2],
      bytes32(uint256(uint256(0)))
    );
    assertEq(
      entries[createCertificateEventIndex].topics[3],
      bytes32(uint256(uint160(address(_bpNori))))
    );
    (
      address from,
      uint256 eventCertificateAmount,
      uint256[] memory removalIds,
      uint256[] memory removalAmounts,
      uint256 priceMultiple,
      uint256 noriFeePercentage
    ) = abi.decode(
        entries[createCertificateEventIndex].data,
        (address, uint256, uint256[], uint256[], uint256, uint256)
      );
    assertEq(from, address(_removal));
    assertEq(eventCertificateAmount, _certificateAmount);
    assertEq(priceMultiple, _priceMultiple);
    assertEq(noriFeePercentage, _customFee);
    assertEq(removalIds.length, 3);
    assertEq(removalAmounts.length, 3);
    assertEq(removalIds, _removalIds.slice(2, 5));
    assertEq(removalAmounts, _expectedRemovalAmounts);
  }

  function test_revertsWhenNoRemovalsFromSpecifiedVintages() external {
    uint256[] memory nonexistentVintages = new uint256[](2);
    _vintages[0] = 9999; // no such vintages available in market
    vm.prank(_namedAccounts.buyer);
    vm.expectRevert(InsufficientSupply.selector);
    _market.swapWithoutFeeSpecialOrder(
      _namedAccounts.buyer,
      _namedAccounts.buyer,
      _certificateAmount,
      _customFee,
      _priceMultiple,
      address(0),
      nonexistentVintages
    );
  }
}

// contract Checkout_swapWithoutFeeSpecialOrder_specificSupplier is Checkout {
//   uint256 private _customFee = 5;
//   uint256 private _certificateAmount = 1 ether;
//   uint256 private _customPriceMultiple = 2500; // $25.00 -- test above the default price multiple of $20.00
//   address private _nonexistentSupplier = account("nonexistent supplier");
//   uint256 private _holdbackPercentage = 0;
//   uint256 private _priceMultipleScale = 100;

//   function setUp() external {
//     _removalIds = _seedRemovals({
//       to: _namedAccounts.supplier,
//       count: 1,
//       list: true
//     });
//     uint256 purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
//       amount: _certificateAmount,
//       priceMultiple: _customPriceMultiple
//     });
//     _market.grantRole({
//       role: _market.MARKET_ADMIN_ROLE(),
//       account: _namedAccounts.buyer
//     });
//     vm.prank(_namedAccounts.admin);
//     _bpNori.deposit(_namedAccounts.buyer, abi.encode(purchaseAmount));
//     vm.prank(_namedAccounts.buyer);
//     _bpNori.approve(address(_market), purchaseAmount);
//   }

//   function test() external {
//     vm.prank(_namedAccounts.buyer);
//     vm.recordLogs();
//     _market.swapWithoutFeeSpecialOrder({
//       recipient: _namedAccounts.buyer,
//       purchaser: _namedAccounts.buyer,
//       amount: _certificateAmount,
//       customFee: _customFee,
//       customPriceMultiple: _customPriceMultiple,
//       supplier: _namedAccounts.supplier,
//       vintages: new uint256[](0)
//     });
//     Vm.Log[] memory entries = vm.getRecordedLogs();
//     uint256 createCertificateEventIndex;
//     for (uint256 i = 0; i < entries.length; ++i) {
//       if (entries[i].topics[0] == CREATE_CERTIFICATE_EVENT_SELECTOR) {
//         createCertificateEventIndex = i;
//         break;
//       }
//     }
//     assertEq(
//       entries[createCertificateEventIndex].topics[0],
//       CREATE_CERTIFICATE_EVENT_SELECTOR
//     );
//     assertEq(
//       entries[createCertificateEventIndex].topics[1],
//       bytes32(uint256(uint160(address(_namedAccounts.buyer))))
//     );
//     assertEq(
//       entries[createCertificateEventIndex].topics[2],
//       bytes32(uint256(uint256(0)))
//     );
//     assertEq(
//       entries[createCertificateEventIndex].topics[3],
//       bytes32(uint256(uint160(address(_bpNori))))
//     );
//     (
//       address from,
//       uint256 eventCertificateAmount,
//       uint256[] memory removalIds,
//       uint256[] memory removalAmounts,
//       uint256 priceMultiple,
//       uint256 noriFeePercentage
//     ) = abi.decode(
//         entries[createCertificateEventIndex].data,
//         (address, uint256, uint256[], uint256[], uint256, uint256)
//       );
//     assertEq(from, address(_removal));
//     assertEq(eventCertificateAmount, _certificateAmount);
//     assertEq(priceMultiple, _customPriceMultiple);
//     assertEq(noriFeePercentage, _customFee);
//     assertEq(removalIds.length, 1);
//     assertEq(removalAmounts.length, 1);
//     assertEq(removalIds[0], _removalIds[0]);
//     assertEq(removalAmounts[0], _certificateAmount);
//     assertEq(
//       _bpNori.balanceOf(_namedAccounts.supplier),
//       ((_certificateAmount * _customPriceMultiple) * _holdbackPercentage) /
//         _priceMultipleScale /
//         100
//     );
//     assertEq(_bpNori.balanceOf(_namedAccounts.feeWallet), 0);
//   }

//   function test_revertsWhenSupplierDoesNotExistInMarket() external {
//     vm.prank(_namedAccounts.buyer);
//     vm.expectRevert(InsufficientSupply.selector);
//     _market.swapWithoutFeeSpecialOrder({
//       recipient: _namedAccounts.buyer,
//       purchaser: _namedAccounts.buyer,
//       amount: _certificateAmount,
//       customFee: _customFee,
//       customPriceMultiple: _customPriceMultiple,
//       supplier: _nonexistentSupplier,
//       vintages: new uint256[](0)
//     });
//   }
// }

contract Checkout_swapWithoutFeeSpecialOrder_specificVintagesSpecificSupplier is
  Checkout
{
  uint256 private _customFee = 5;
  uint256 private _certificateAmount = 1.5 ether;
  uint256[] private _vintages = [2019, 2020];
  uint256 private _priceMultiple = 2000;
  uint256[] private _expectedRemovalAmounts;

  function setUp() external {
    /**
     * Supplier 1: 2018 vintage
     * Supplier 2: 2018, 2019 and 2020 vintage
     * Supplier 3: 2019 vintage
     * All removals are 1 tonne
     * Certificate amount is 1.5 tonnes
     * Fulfillment should result in all of supplier2's 2019 removal being used, and .5 tonne of supplier2's 2020 removal
     */
    _expectedRemovalAmounts.push(1 ether);
    _expectedRemovalAmounts.push(0.5 ether);
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier,
        amount: 1 ether,
        vintage: 2018
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier2,
        amount: 1 ether,
        vintage: 2018
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier2,
        amount: 1 ether,
        vintage: 2019
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier2,
        amount: 1 ether,
        vintage: 2020
      })
    );
    _removalIds.push(
      _seedAndListRemoval({
        supplier: _namedAccounts.supplier3,
        amount: 1 ether,
        vintage: 2019
      })
    );
    uint256 purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
      amount: _certificateAmount,
      priceMultiple: _priceMultiple
    });
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(purchaseAmount));
    vm.prank(_namedAccounts.buyer);
    _bpNori.approve(address(_market), purchaseAmount);
  }

  function test_basicFulfillment() external {
    vm.prank(_namedAccounts.buyer);
    vm.expectEmit(true, true, true, true);
    emit CreateCertificate({
      from: address(_removal),
      recipient: _namedAccounts.buyer,
      certificateId: 0,
      certificateAmount: _certificateAmount,
      removalIds: _removalIds.slice(2, 4),
      removalAmounts: _expectedRemovalAmounts,
      purchasingTokenAddress: address(_bpNori),
      priceMultiple: _priceMultiple,
      noriFeePercentage: _customFee
    });
    _market.swapWithoutFeeSpecialOrder(
      _namedAccounts.buyer,
      _namedAccounts.buyer,
      _certificateAmount,
      _customFee,
      _priceMultiple,
      _namedAccounts.supplier2,
      _vintages
    );
  }
}
