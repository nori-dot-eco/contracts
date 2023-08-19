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
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
  }

  function test() external {
    // todo refactor so assertions
    // todo refactor so setup lives in this contracts setUp function (improves gas reporting)
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 certificateAmount = 1 ether;
    uint256 amount = _market.calculateCheckoutTotal(certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
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
      certificateAmount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }
}

contract Checkout_buyingFromOneRemoval_byApproval is Checkout {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
  }

  function test() external {
    // todo refactor so assertions
    // todo refactor so setup lives in this contracts setUp function (improves gas reporting)
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 certificateAmount = 1 ether;
    uint256 amount = _market.calculateCheckoutTotal(certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    vm.prank(owner);
    _bpNori.approve(address(_market), MAX_INT);
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(owner);
    _market.swap(owner, certificateAmount);
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }
}

contract Checkout_swapWithDifferentPermitSignerAndMsgSender is Checkout {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
  }

  function test() external {
    // todo refactor so assertions
    // todo refactor so setup lives in this contracts setUp function (improves gas reporting)
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 certificateAmount = 1 ether;
    uint256 amount = _market.calculateCheckoutTotal(certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
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
    address msgSender = vm.addr(0x12345);
    vm.prank(msgSender);
    _market.swap(
      owner,
      owner,
      certificateAmount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
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
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
  }

  function test() external {
    vm.prank(_owner);
    _market.swap(
      _owner,
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
  address private _owner;

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
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: _owner});
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.prank(_owner);
    _bpNori.approve(address(_market), MAX_INT); // infinite approval for Market to spend owner's tokens
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
  }

  function test() external {
    vm.prank(_owner);
    _market.swapWithoutFeeSpecialOrder({
      recipient: _owner,
      purchaser: _owner,
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
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_singleSupplier is Checkout {
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
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: _owner});
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
    vm.prank(_owner);
    _market.swapFromSupplier({
      recipient: _owner,
      permitOwner: _owner,
      amount: _expectedCertificateAmount,
      supplier: _namedAccounts.supplier,
      deadline: _signedPermit.permit.deadline,
      v: _signedPermit.v,
      r: _signedPermit.r,
      s: _signedPermit.s
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
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_singleSupplier_byApproval is Checkout {
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
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: _owner});
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.prank(_owner);
    _bpNori.approve(address(_market), MAX_INT);
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
    vm.prank(_owner);
    _market.swapFromSupplier({
      recipient: _owner,
      permitOwner: _owner,
      amount: _expectedCertificateAmount,
      supplier: _namedAccounts.supplier,
      deadline: _signedPermit.permit.deadline,
      v: _signedPermit.v,
      r: _signedPermit.r,
      s: _signedPermit.s
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
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_singleSupplier_withoutFee is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;

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
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.prank(_owner);
    _bpNori.approve(address(_market), MAX_INT);
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: _owner});
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_owner);
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
    vm.prank(_owner);

    _market.swapWithoutFeeSpecialOrder({
      recipient: _owner,
      purchaser: _owner,
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
      _owner,
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
  uint256 deadline = 1 days;
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 amount;
  uint256 fee;
  uint256 certificateAmount;

  function setUp() external {
    _erc20 = _deployMockERC20();

    _mockERC20SignatureUtils = new SignatureUtils();
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: _erc20,
      priceMultiple: 2000
    });
    assertEq(_market.getPurchasingTokenAddress(), address(_erc20));
    certificateAmount = 1 ether;
    amount = _market.calculateCheckoutTotal(certificateAmount);
    fee = _market.calculateNoriFee(certificateAmount);
    _erc20.transfer(owner, amount);
    assertEq(_erc20.balanceOf(address(owner)), amount);
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      holdbackPercentage: 0
    });
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
      ownerPrivateKey,
      address(_market),
      amount,
      1 days,
      _erc20
    );
    vm.recordLogs();
    vm.prank(owner);
    _market.swap(
      owner,
      owner,
      certificateAmount,
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
          bytes32(uint256(uint160(address(owner))))
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
        assertEq(eventCertificateAmount, certificateAmount);
        assertEq(priceMultiple, _market.getPriceMultiple());
        assertEq(noriFeePercentage, _market.getNoriFeePercentage());
        assertEq(removalIds.length, 1);
        assertEq(removalAmounts.length, 1);
        assertEq(removalIds[0], _removalIds[0]);
        assertEq(removalAmounts[0], certificateAmount);
      }
    }
    assertEq(containsCreateCertificateEventSelector, true);
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
    assertEq(_erc20.balanceOf(address(owner)), 0);
    assertEq(_erc20.balanceOf(_namedAccounts.supplier), amount - fee);
    assertEq(_erc20.balanceOf(_market.getNoriFeeWallet()), fee);
  }
}

contract Checkout_buyingWithAlternateERC20_floatingPointPriceMultiple is
  Checkout
{
  MockERC20Permit internal _erc20;
  SignatureUtils internal _mockERC20SignatureUtils;
  uint256 deadline = 1 days;
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 amount;
  uint256 fee;
  uint256 certificateAmount;

  function setUp() external {
    _erc20 = _deployMockERC20();

    _mockERC20SignatureUtils = new SignatureUtils();
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: _erc20,
      priceMultiple: 1995 // $19.95
    });
    assertEq(_market.getPurchasingTokenAddress(), address(_erc20));
    certificateAmount = 1 ether;
    amount = _market.calculateCheckoutTotal(certificateAmount);
    fee = _market.calculateNoriFee(certificateAmount);
    _erc20.transfer(owner, amount);
    assertEq(_erc20.balanceOf(address(owner)), amount);
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      holdbackPercentage: 0
    });
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
      ownerPrivateKey,
      address(_market),
      amount,
      1 days,
      _erc20
    );
    vm.recordLogs();
    vm.prank(owner);
    _market.swap(
      owner,
      owner,
      certificateAmount,
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
          bytes32(uint256(uint160(address(owner))))
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
        assertEq(eventCertificateAmount, certificateAmount);
        assertEq(priceMultiple, _market.getPriceMultiple());
        assertEq(noriFeePercentage, _market.getNoriFeePercentage());
        assertEq(removalIds.length, 1);
        assertEq(removalAmounts.length, 1);
        assertEq(removalIds[0], _removalIds[0]);
        assertEq(removalAmounts[0], certificateAmount);
      }
    }
    assertEq(containsCreateCertificateEventSelector, true);
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
    assertEq(_erc20.balanceOf(address(owner)), 0);
    assertEq(_erc20.balanceOf(_namedAccounts.supplier), amount - fee);
    assertEq(_erc20.balanceOf(_market.getNoriFeeWallet()), fee);
  }
}

contract Checkout_swapWithoutFeeSpecialOrder is Checkout {
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 customFee = 5;
  uint256 certificateAmount = 1 ether;
  uint256 customPriceMultiple = 1800; // $18.00 -- test below the default price multiple of $20.00
  uint256[] vintages = new uint256[](0);

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    uint256 purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
      amount: certificateAmount,
      priceMultiple: customPriceMultiple
    });
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: owner});
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(purchaseAmount));
    vm.prank(owner);
    _bpNori.approve(address(_market), purchaseAmount);
  }

  function test() external {
    vm.prank(owner);
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder({
      recipient: owner,
      purchaser: owner,
      amount: certificateAmount,
      customFee: customFee,
      customPriceMultiple: customPriceMultiple,
      supplier: address(0),
      vintages: vintages
    });

    Vm.Log[] memory entries = vm.getRecordedLogs();
    uint256 createCertificateEventIndex = 8;
    assertEq(
      entries[createCertificateEventIndex].topics[0],
      CREATE_CERTIFICATE_EVENT_SELECTOR
    );
    assertEq(
      entries[createCertificateEventIndex].topics[1],
      bytes32(uint256(uint160(address(owner))))
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
    assertEq(eventCertificateAmount, certificateAmount);
    assertEq(priceMultiple, customPriceMultiple);
    assertEq(noriFeePercentage, customFee);
    assertEq(removalIds.length, 1);
    assertEq(removalAmounts.length, 1);
    assertEq(removalIds[0], _removalIds[0]);
    assertEq(removalAmounts[0], certificateAmount);

    assertEq(
      _bpNori.balanceOf(_namedAccounts.supplier),
      (certificateAmount * customPriceMultiple) / 100 / 2 // divide to account for price multiple scale and holdback percentage of 50%
    );
    assertEq(_bpNori.balanceOf(_namedAccounts.feeWallet), 0);
  }
}

contract Checkout_swapWithoutFeeSpecialOrder_specificVintages is Checkout {
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 customFee = 5;
  uint256 certificateAmount = 2.5 ether;
  uint256[] vintages = [2019, 2020];
  uint256 _priceMultiple = 2000;

  function setUp() external {
    /**
     * Supplier 1: 2018 vintage
     * Supplier 2: 2018, 2019 and 2020 vintage
     * Supplier 3: 2019 vintage
     * All removals are 1 tonne
     * Certificate amount is 2.5 tonnes
     * Fulfillment should result in all of supplier2's removals being used, and .5 tonne of supplier3's removals
     */
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
      amount: certificateAmount,
      priceMultiple: _priceMultiple
    });
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: owner});
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(purchaseAmount));
    vm.prank(owner);
    _bpNori.approve(address(_market), purchaseAmount);
  }

  function test_basicFulfillment() external {
    vm.prank(owner);
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder(
      owner,
      owner,
      certificateAmount,
      customFee,
      _priceMultiple,
      address(0),
      vintages
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
      bytes32(uint256(uint160(address(owner))))
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
    assertEq(eventCertificateAmount, certificateAmount);
    assertEq(priceMultiple, _priceMultiple);
    assertEq(noriFeePercentage, customFee);
    assertEq(removalIds.length, 3);
    assertEq(removalAmounts.length, 3);
    assertEq(removalIds[0], _removalIds[2]);
    assertEq(removalIds[1], _removalIds[3]);
    assertEq(removalIds[2], _removalIds[4]);
    assertEq(removalAmounts[0], 1 ether);
    assertEq(removalAmounts[1], 1 ether);
    assertEq(removalAmounts[2], 0.5 ether);
  }
}

contract Checkout_swapWithoutFeeSpecialOrder_specificSupplier is Checkout {
  uint256 ownerPrivateKey = 0xA11CE;
  address owner = vm.addr(ownerPrivateKey);
  uint256 customFee = 5;
  uint256 certificateAmount = 1 ether;
  uint256 customPriceMultiple = 2500; // $25.00 -- test above the default price multiple of $20.00

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    uint256 purchaseAmount = _market.calculateCheckoutTotalWithoutFee({
      amount: certificateAmount,
      priceMultiple: customPriceMultiple
    });
    _market.grantRole({role: _market.MARKET_ADMIN_ROLE(), account: owner});
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(purchaseAmount));
    vm.prank(owner);
    _bpNori.approve(address(_market), purchaseAmount);
  }

  function test() external {
    vm.prank(owner);
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder({
      recipient: owner,
      purchaser: owner,
      amount: certificateAmount,
      customFee: customFee,
      customPriceMultiple: customPriceMultiple,
      supplier: _namedAccounts.supplier,
      vintages: new uint256[](0)
    });
    Vm.Log[] memory entries = vm.getRecordedLogs();
    uint256 createCertificateEventIndex = 8;
    assertEq(
      entries[createCertificateEventIndex].topics[0],
      CREATE_CERTIFICATE_EVENT_SELECTOR
    );
    assertEq(
      entries[createCertificateEventIndex].topics[1],
      bytes32(uint256(uint160(address(owner))))
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
    assertEq(eventCertificateAmount, certificateAmount);
    assertEq(priceMultiple, customPriceMultiple);
    assertEq(noriFeePercentage, customFee);
    assertEq(removalIds.length, 1);
    assertEq(removalAmounts.length, 1);
    assertEq(removalIds[0], _removalIds[0]);
    assertEq(removalAmounts[0], certificateAmount);
    assertEq(
      _bpNori.balanceOf(_namedAccounts.supplier),
      (certificateAmount * customPriceMultiple) / 100 / 2 // divide to account for price multiple scale and holdback percentage of 50%
    );
    assertEq(_bpNori.balanceOf(_namedAccounts.feeWallet), 0);
  }
}
