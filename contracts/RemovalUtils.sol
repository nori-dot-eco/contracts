// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

struct UnpackedRemovalIdV0 {
  uint256 idVersion;
  uint256 methodology;
  uint256 methodologyVersion;
  uint256 vintage;
  string country;
  string admin1;
  address supplierAddress;
  uint256 subIdentifier;
}

uint256 constant _BITS_PER_BYTE = 8;

uint256 constant _ID_VERSION_FIELD_LENGTH = 1;
uint256 constant _METHODOLOGY_DATA_FIELD_LENGTH = 1;
uint256 constant _VINTAGE_FIELD_LENGTH = 2;
uint256 constant _COUNTRY_CODE_FIELD_LENGTH = 2;
uint256 constant _ADMIN1_CODE_FIELD_LENGTH = 2;
uint256 constant _ADDRESS_FIELD_LENGTH = 20;
uint256 constant _SUBID_FIELD_LENGTH = 4;

uint256 constant _ID_VERSION_OFFSET = 31;
uint256 constant _METHODOLOGY_DATA_OFFSET = 30;
uint256 constant _VINTAGE_OFFSET = 28;
uint256 constant _COUNTRY_CODE_OFFSET = 26;
uint256 constant _ADMIN1_CODE_OFFSET = 24;
uint256 constant _ADDRESS_OFFSET = 4;
uint256 constant _SUBID_OFFSET = 0;

/**
 * @dev Library encapsulating the logic around encoding and decoding removal token ids.
 *
 * The token ids used for a given ERC1155 token in Removal.sol encode information about the carbon removal
 * in the following format(s), where the first byte encodes the format version:
 *
 * Version 0:
 * [1byte][1byte][--2 bytes--][--2 bytes--][--2 bytes--][----------- 20 bytes------------- ][------4 bytes------]
 * tokIdV--meth&v---vintage------country------admin1------------ supplier address --------------subidentifier--
 *
 * For methodology 1 (regenerative ag), the subidentifier serves as a parcel identifier.
 *
 */
library RemovalUtils {
  function createRemovalId(bytes calldata removalData)
    internal
    pure
    returns (uint256)
  {
    uint256 idVersion = abi.decode(removalData, (uint256));
    require(idVersion == 0, "Unsupported removal token id version");

    UnpackedRemovalIdV0 memory params = abi.decode(
      removalData,
      (UnpackedRemovalIdV0)
    );
    bytes memory countryBytes = bytes(params.country);
    bytes memory admin1Bytes = bytes(params.admin1);
    require(countryBytes.length == 2, "Country code must be two characters");
    require(admin1Bytes.length == 2, "Admin1 code must be two characters");
    // TODO: additional field validation & tests for validation logic
    uint256 methodologyData = (params.methodology << 4) |
      params.methodologyVersion;

    return
      (params.idVersion << (_ID_VERSION_OFFSET * _BITS_PER_BYTE)) |
      (methodologyData << (_METHODOLOGY_DATA_OFFSET * _BITS_PER_BYTE)) |
      (params.vintage << (_VINTAGE_OFFSET * _BITS_PER_BYTE)) |
      ((uint256(uint8(countryBytes[0])) <<
        (_COUNTRY_CODE_OFFSET * _BITS_PER_BYTE + _BITS_PER_BYTE)) |
        (uint256(uint8(countryBytes[1])) <<
          (_COUNTRY_CODE_OFFSET * _BITS_PER_BYTE))) |
      ((uint256(uint8(admin1Bytes[0])) <<
        (_ADMIN1_CODE_OFFSET * _BITS_PER_BYTE + _BITS_PER_BYTE)) |
        (uint256(uint8(admin1Bytes[1])) <<
          (_ADMIN1_CODE_OFFSET * _BITS_PER_BYTE))) |
      (uint256(uint160(params.supplierAddress)) <<
        (_ADDRESS_OFFSET * _BITS_PER_BYTE)) |
      (params.subIdentifier << (_SUBID_OFFSET * _BITS_PER_BYTE));
  }

  function unpackRemovalId(uint256 removalId)
    internal
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    uint256 version = version(removalId);
    uint256 methodology = methodology(removalId);
    uint256 methodologyVersion = methodologyVersion(removalId);
    uint256 vintage = vintage(removalId);
    string memory country = countryCode(removalId);
    string memory admin1 = admin1Code(removalId);
    address supplierAddress = supplierAddress(removalId);
    uint256 subIdentifier = subIdentifier(removalId);

    return
      UnpackedRemovalIdV0(
        version,
        methodology,
        methodologyVersion,
        vintage,
        country,
        admin1,
        supplierAddress,
        subIdentifier
      );
  }

  function version(uint256 removalId) internal pure returns (uint256) {
    return
      _extractValue(removalId, _ID_VERSION_FIELD_LENGTH, _ID_VERSION_OFFSET);
  }

  function methodology(uint256 removalId) internal pure returns (uint256) {
    return
      _extractValue(
        removalId,
        _METHODOLOGY_DATA_FIELD_LENGTH,
        _METHODOLOGY_DATA_OFFSET
      ) >> 4; // methodology encoded in the first nibble
  }

  function methodologyVersion(uint256 removalId)
    internal
    pure
    returns (uint256)
  {
    return
      _extractValue(
        removalId,
        _METHODOLOGY_DATA_FIELD_LENGTH,
        _METHODOLOGY_DATA_OFFSET
      ) & 7; // methodology version encoded in the second nibble
  }

  function vintage(uint256 removalId) internal pure returns (uint256) {
    return _extractValue(removalId, _VINTAGE_FIELD_LENGTH, _VINTAGE_OFFSET);
  }

  function countryCode(uint256 removalId)
    internal
    pure
    returns (string memory)
  {
    bytes32 extractedCode = bytes32(
      _extractValue(removalId, _COUNTRY_CODE_FIELD_LENGTH, _COUNTRY_CODE_OFFSET)
    );
    bytes memory bytesArray = new bytes(2);
    bytesArray[0] = extractedCode[30];
    bytesArray[1] = extractedCode[31];
    return string(bytesArray);
  }

  function admin1Code(uint256 removalId) internal pure returns (string memory) {
    bytes32 extractedCode = bytes32(
      _extractValue(removalId, _ADMIN1_CODE_FIELD_LENGTH, _ADMIN1_CODE_OFFSET)
    );
    bytes memory bytesArray = new bytes(2);
    bytesArray[0] = extractedCode[30];
    bytesArray[1] = extractedCode[31];
    return string(bytesArray);
  }

  function supplierAddress(uint256 removalId) internal pure returns (address) {
    return
      address(
        uint160(
          _extractValue(removalId, _ADDRESS_FIELD_LENGTH, _ADDRESS_OFFSET)
        )
      );
  }

  function subIdentifier(uint256 removalId) internal pure returns (uint256) {
    return _extractValue(removalId, _SUBID_FIELD_LENGTH, _SUBID_OFFSET);
  }

  function _extractValue(
    uint256 removalId,
    uint256 numBytesFieldLength,
    uint256 numBytesOffsetFromRight
  ) private pure returns (uint256) {
    bytes32 mask = bytes32(2**(numBytesFieldLength * _BITS_PER_BYTE) - 1) <<
      (numBytesOffsetFromRight * _BITS_PER_BYTE);
    bytes32 maskedValue = bytes32(removalId) & mask;
    return uint256(maskedValue >> (numBytesOffsetFromRight * _BITS_PER_BYTE));
  }
}
