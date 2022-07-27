/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/certificate.sol";
import "@/test/helpers/removal.sol";

contract Certificate_name is UpgradeableCertificate {
  function test() external {
    assertEq(_certificate.name(), "Certificate");
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
      abi.encode(_owner)
    );
    assertEq(
      _certificate.totalSupply(),
      1,
      "Total supply should be incremented after minting"
    );
  }

  function test() external {
    console.log("uint64===", uint64(uint256(1)));

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
      abi.encode(address(this)) // todo use diff. named account
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
  }
}
