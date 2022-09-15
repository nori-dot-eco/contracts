/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@/test/helpers/test.sol";

struct Permit {
  address owner;
  address spender;
  uint256 value;
  uint256 nonce;
  uint256 deadline;
}

struct SignedPermit {
  Permit permit;
  uint8 v;
  bytes32 r;
  bytes32 s;
}

contract SignatureUtils is Global {
  /**
   * @dev This hash is the result of
   * `keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")`.
   */
  bytes32 public constant PERMIT_TYPEHASH =
    0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  bytes32 internal _domainSeparator;

  constructor(bytes32 domainSeparator) {
    _domainSeparator = domainSeparator;
  }

  function generatePermit(
    uint256 ownerPrivateKey,
    address spender,
    uint256 amount,
    uint256 deadline,
    IERC20PermitUpgradeable token
  ) external returns (SignedPermit memory) {
    address owner = vm.addr(ownerPrivateKey);
    Permit memory permit = Permit({
      owner: owner,
      spender: spender,
      value: amount,
      nonce: token.nonces(owner),
      deadline: deadline
    });
    bytes32 digest = _getTypedDataHash(permit);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
    return SignedPermit({permit: permit, v: v, r: r, s: s});
  }

  /**
   * @dev computes the hash of the fully encoded EIP-712 message for the domain, which can be used to recover the
   * signer.
   */
  function _getTypedDataHash(Permit memory permit)
    internal
    view
    returns (bytes32)
  {
    return
      keccak256(
        abi.encodePacked("\x19\x01", _domainSeparator, _getStructHash(permit))
      );
  }

  /**
   * @dev Computes the hash of a permit.
   */
  function _getStructHash(Permit memory permit)
    internal
    pure
    returns (bytes32)
  {
    return
      keccak256(
        abi.encode(
          PERMIT_TYPEHASH,
          permit.owner,
          permit.spender,
          permit.value,
          permit.nonce,
          permit.deadline
        )
      );
  }
}
