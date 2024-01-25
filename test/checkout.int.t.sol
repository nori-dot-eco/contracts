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
    keccak256("CreateCertificate(address,uint256,uint256,uint256[],uint256[])");

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
  uint256 private _certificateAmount = 1 ether;
  uint256 private _amount;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });

    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
  }

  function test() external {
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      amount: _certificateAmount,
      supplier: address(0),
      vintages: new uint256[](0)
    });
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
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
  }

  function test() external {
    _market.swapWithoutFeeSpecialOrder({
      recipient: _owner,
      amount: _expectedCertificateAmount,
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
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _expectedCertificateAmount = 10 ether;
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
      amount: _expectedCertificateAmount,
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
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      0,
      "Certificate balance is wrong"
    );
  }

  function test() external {
    _market.swapWithoutFeeSpecialOrder({
      recipient: _owner,
      amount: _expectedCertificateAmount,
      supplier: address(0),
      vintages: new uint256[](0)
    });
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

contract Checkout_swapWithoutFeeSpecialOrder is Checkout {
  uint256 private _certificateAmount = 1 ether;
  uint256[] private _vintages = new uint256[](0);

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      amount: _certificateAmount,
      supplier: address(0),
      vintages: _vintages
    });

    Vm.Log[] memory entries = vm.getRecordedLogs();
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
    (
      uint256 eventCertificateAmount,
      uint256[] memory removalIds,
      uint256[] memory removalAmounts
    ) = abi.decode(
        entries[createCertificateEventIndex].data,
        (uint256, uint256[], uint256[])
      );
    assertEq(eventCertificateAmount, _certificateAmount);
    assertEq(removalIds.length, 1);
    assertEq(removalAmounts.length, 1);
    assertEq(removalIds[0], _removalIds[0]);
    assertEq(removalAmounts[0], _certificateAmount);
  }
}

contract Checkout_swapWithoutFeeSpecialOrder_specificVintages is Checkout {
  uint256 private _certificateAmount = 2.5 ether;
  uint256[] private _vintages = [2019, 2020];
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
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
  }

  function test_basicFulfillment() external {
    vm.prank(_namedAccounts.buyer);
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder(
      _namedAccounts.buyer,
      _certificateAmount,
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
    (
      uint256 eventCertificateAmount,
      uint256[] memory removalIds,
      uint256[] memory removalAmounts
    ) = abi.decode(
        entries[createCertificateEventIndex].data,
        (uint256, uint256[], uint256[])
      );
    assertEq(eventCertificateAmount, _certificateAmount);
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
      _certificateAmount,
      address(0),
      nonexistentVintages
    );
  }
}

contract Checkout_swapWithoutFeeSpecialOrder_specificSupplier is Checkout {
  uint256 private _certificateAmount = 1 ether;
  address private _nonexistentSupplier = account("nonexistent supplier");

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
  }

  function test() external {
    vm.recordLogs();
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      amount: _certificateAmount,
      supplier: _namedAccounts.supplier,
      vintages: new uint256[](0)
    });
    Vm.Log[] memory entries = vm.getRecordedLogs();
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
    (
      uint256 eventCertificateAmount,
      uint256[] memory removalIds,
      uint256[] memory removalAmounts
    ) = abi.decode(
        entries[createCertificateEventIndex].data,
        (uint256, uint256[], uint256[])
      );
    assertEq(eventCertificateAmount, _certificateAmount);
    assertEq(removalIds.length, 1);
    assertEq(removalAmounts.length, 1);
    assertEq(removalIds[0], _removalIds[0]);
    assertEq(removalAmounts[0], _certificateAmount);
  }

  function test_revertsWhenSupplierDoesNotExistInMarket() external {
    vm.prank(_namedAccounts.buyer);
    vm.expectRevert(InsufficientSupply.selector);
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      amount: _certificateAmount,
      supplier: _nonexistentSupplier,
      vintages: new uint256[](0)
    });
  }
}

contract Checkout_swapWithoutFeeSpecialOrder_specificVintagesSpecificSupplier is
  Checkout
{
  uint256 private _certificateAmount = 1.5 ether;
  uint256[] private _vintages = [2019, 2020];
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
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
  }

  function test_basicFulfillment() external {
    vm.prank(_namedAccounts.buyer);
    vm.expectEmit(true, true, true, true);
    emit CreateCertificate({
      recipient: _namedAccounts.buyer,
      certificateId: 0,
      certificateAmount: _certificateAmount,
      removalIds: _removalIds.slice(2, 4),
      removalAmounts: _expectedRemovalAmounts
    });
    _market.swapWithoutFeeSpecialOrder(
      _namedAccounts.buyer,
      _certificateAmount,
      _namedAccounts.supplier2,
      _vintages
    );
  }
}
