/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/certificate.sol";
import "@/test/helpers/removal.sol";

// todo Add tests that ensure _removalsOfCertificate/_certificatesOfRemoval can't deviate from Removal.sol balances
// todo write better _burn tests that ensure removal AND certificate balances are updated correctly

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
      abi.encode(false, _owner, 1 ether, address(0), 100, 15)
    );
    assertEq(
      _certificate.totalSupply(),
      1,
      "Total supply should be incremented after minting"
    );
    assertEq(_certificate.getPurchaseAmount(0), 1 ether);
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
    assertTrue(
      _certificate.explicitOwnershipOf(_removalIds[0]).burned,
      "Certificate was not burned"
    );
    assertEq(
      _certificate.getPurchaseAmount(0),
      1 ether,
      "Certificate purchase amount should never change"
    );
    // token IDs continue at the next ID despite burning previous IDs
    // todo refactor to separate test
    vm.prank(address(_removal));
    _certificate.onERC1155BatchReceived(
      address(0),
      address(0),
      _removalIds2,
      _removalAmounts,
      abi.encode(false, address(this), 1 ether, address(0), 100, 15) // todo use diff. named account
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
    assertEq(_certificate.getPurchaseAmount(0), 1 ether);
    assertEq(_certificate.getPurchaseAmount(1), 1 ether);
  }

  function test_reverts_when_paused() external {
    _certificate.pause();
    vm.prank(_owner);
    vm.expectRevert("Pausable: paused");
    _certificate.burn(_certificateId);
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

  function test_reverts_when_paused() external {
    super._pause();
    vm.expectRevert("Pausable: paused");
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

  function test_overload_reverts_when_paused() external {
    super._pause();
    vm.expectRevert("Pausable: paused");
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

  function test_reverts_when_paused() external {
    super._pause();
    vm.expectRevert("Pausable: paused");
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

contract Certificate_supportsInterface is NonUpgradeableCertificate {
  function test() external {
    bool support;
    support = this.supportsInterface(0x5a05180f); // interface ID for AccessControl
    assertEq(support, true);

    support = this.supportsInterface(0x01ffc9a7); // interface ID for ERC165
    assertEq(support, true);

    support = this.supportsInterface(0x5b5e139f); // interface ID for ERC721Metadata
    assertEq(support, true);

    support = this.supportsInterface(0x80ac58cd); // interface ID for ERC721
    assertEq(support, true);
  }
}
