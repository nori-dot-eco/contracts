/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.16;
import "@/test/helpers/certificate.sol";
import "@/test/helpers/removal.sol";

contract Certificate_name is UpgradeableCertificate {
  function test() external {
    assertEq(_certificate.name(), "Certificate");
  }
}

contract Certificate__msgSenderERC721A is NonUpgradeableCertificate {
  function test() external {
    assertEq(
      _msgSenderERC721A(),
      _msgSender(),
      "Expected _msgSenderERC721A() and _msgSender() to return the same value"
    );
  }
}

contract Certificate_burn is UpgradeableCertificate {
  address private _owner = _namedAccounts.buyer;
  uint256 private _certificateId = 0;
  uint256[] private _removalIds = [0]; // todo pre-encoded removalid fixture
  uint256[] private _removalIds2 = [1]; // todo pre-encoded removalid fixture
  uint256[] private _removalAmounts = [1 ether];

  function setUp() external {
    vm.prank(address(_removal));
    _certificate.onERC1155BatchReceived(
      address(0),
      address(0),
      _removalIds,
      _removalAmounts,
      abi.encode(_owner, 1 ether)
    );
    assertEq(
      _certificate.totalSupply(),
      1,
      "Total supply should be incremented after minting"
    );
    assertEq(
      _certificate.purchaseAmount(0),
      1 ether,
      "Total supply should be incremented after minting"
    );
  }

  function test() external {
    vm.prank(_owner);
    _certificate.burn(_certificateId);
    assertEq(
      _certificate.balanceOf(_owner),
      0,
      "Certificate balance should be decremented"
    );
    assertEq(
      _certificate.totalSupply(),
      0,
      "Total supply should be decremented after burning"
    );
    assertEq(
      _asSingletonUintArray(
        _certificate.removalsOfCertificate(_certificateId)[0].id
      ),
      _removalIds,
      "Certificate does not have underlying removals"
    );
    assertEq(
      _certificate.certificatesOfRemoval(_removalIds[0])[0].id,
      _certificateId,
      "Removal is not used for certificate"
    );
    assertTrue(
      _certificate.explicitOwnershipOf(_removalIds[0]).burned,
      "Certificate was not burned"
    );

    // token IDs continue at the next ID despite burning previous IDs
    // todo refactor to seperate test
    vm.prank(address(_removal));
    _certificate.onERC1155BatchReceived(
      address(0),
      address(0),
      _removalIds2,
      _removalAmounts,
      abi.encode(address(this), 1 ether) // todo use diff. named account
    );
    assertEq(
      _certificate.balanceOf(address(this)),
      1,
      "Certificate balance should be incremented"
    );
    assertEq(
      _certificate.ownerOf(_certificateId + 1),
      address(this),
      "Owner of token ID 1 is incorrect"
    );
    assertEq(
      _certificate.totalSupply(),
      _certificateId + 1,
      "Total supply should be incremented after minting"
    );
    assertEq(
      _certificate.certificatesOfRemoval(_removalIds2[0])[0].id,
      _certificateId + 1,
      "Removal is not used for certificate"
    );
    assertEq(
      _certificate.purchaseAmount(0),
      1 ether,
      "Certificate original balance should be unchanged after burning"
    );
  }
}

contract Certificate_approve is UpgradeableCertificate {
  function test() external {
    vm.expectRevert(FunctionDisabled.selector);
    _certificate.approve(_namedAccounts.buyer, 0);
  }
}

contract Certificate_setApprovalForAll is UpgradeableCertificate {
  function test() external {
    vm.expectRevert(FunctionDisabled.selector);
    _certificate.setApprovalForAll(_namedAccounts.buyer, true);
  }
}

contract Certificate_safeTransferFrom is NonUpgradeableCertificate {
  function setUp() external {
    _mint(_namedAccounts.deployer, 1);
    _grantRole({
      role: CERTIFICATE_OPERATOR_ROLE,
      account: _namedAccounts.deployer
    });
  }

  function test() external {
    safeTransferFrom({
      from: _namedAccounts.deployer,
      to: _namedAccounts.buyer,
      tokenId: 0
    });
  }

  function test_overload() external {
    safeTransferFrom({
      from: _namedAccounts.deployer,
      to: _namedAccounts.buyer,
      tokenId: 0,
      _data: ""
    });
  }
}

contract Certificate_safeTransferFrom_reverts_ForbiddenTransferAfterMinting is
  NonUpgradeableCertificate
{
  function setUp() external {
    _mint(_namedAccounts.deployer, 1);
  }

  function test() external {
    vm.expectRevert(ForbiddenTransferAfterMinting.selector);
    safeTransferFrom({
      from: _namedAccounts.deployer,
      to: _namedAccounts.buyer,
      tokenId: 0
    });
  }

  function test_overload() external {
    vm.expectRevert(ForbiddenTransferAfterMinting.selector);
    safeTransferFrom({
      from: _namedAccounts.deployer,
      to: _namedAccounts.buyer,
      tokenId: 0,
      _data: ""
    });
  }
}

contract Certificate_transferFrom is NonUpgradeableCertificate {
  function setUp() external {
    _mint(_namedAccounts.deployer, 1);
    _grantRole({
      role: CERTIFICATE_OPERATOR_ROLE,
      account: _namedAccounts.deployer
    });
  }

  function test() external {
    transferFrom({
      from: _namedAccounts.deployer,
      to: _namedAccounts.buyer,
      tokenId: 0
    });
  }
}

contract Certificate_transferFrom_reverts_ForbiddenTransferAfterMinting is
  NonUpgradeableCertificate
{
  function setUp() external {
    _mint(_namedAccounts.deployer, 1);
  }

  function test() external {
    vm.expectRevert(ForbiddenTransferAfterMinting.selector);
    transferFrom({
      from: _namedAccounts.deployer,
      to: _namedAccounts.buyer,
      tokenId: 0
    });
  }
}
