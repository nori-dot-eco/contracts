// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

struct UnpackedRemovalIdV0 {
  uint8 idVersion;
  uint8 methodology;
  uint8 methodologyVersion;
  uint16 vintage;
  bytes2 country;
  bytes2 admin1;
  address supplierAddress;
  uint32 subIdentifier;
}

uint256 constant _BITS_PER_BYTE = 8;
uint256 constant _ENCODED_LENGTH_BYTES_UNPACKED_ID_V0 = 256;

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

uint256 constant _ASCII_CAP_LETTER_MIN_VAL = 65;
uint256 constant _ASCII_CAP_LETTER_MAX_VAL = 90;

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
    uint256 idVersion = abi.decode(removalData, (uint8));
    require(idVersion == 0, "Unsupported removal token id version");
    require(
      removalData.length == _ENCODED_LENGTH_BYTES_UNPACKED_ID_V0,
      "removalData contains wrong number of bytes"
    );

    UnpackedRemovalIdV0 memory params = abi.decode(
      removalData,
      (UnpackedRemovalIdV0)
    );

    require(params.methodology <= 2**4 - 1, "Metholodogy too large");
    require(
      params.methodologyVersion <= 2**4 - 1,
      "Metholodogy version too large"
    );

    uint256 countryFirstLetter = uint256(uint16(params.country)) >>
      _BITS_PER_BYTE;
    uint256 countrySecondLetter = uint256(uint16(params.country)) &
      uint256(2**8 - 1);
    uint256 admin1FirstLetter = uint256(uint16(params.admin1)) >>
      _BITS_PER_BYTE;
    uint256 admin1SecondLetter = uint256(uint16(params.admin1)) &
      uint256(2**8 - 1);

    require(
      countryFirstLetter >= _ASCII_CAP_LETTER_MIN_VAL &&
        countryFirstLetter <= _ASCII_CAP_LETTER_MAX_VAL &&
        countrySecondLetter >= _ASCII_CAP_LETTER_MIN_VAL &&
        countrySecondLetter <= _ASCII_CAP_LETTER_MAX_VAL &&
        admin1FirstLetter >= _ASCII_CAP_LETTER_MIN_VAL &&
        admin1FirstLetter <= _ASCII_CAP_LETTER_MAX_VAL &&
        admin1SecondLetter >= _ASCII_CAP_LETTER_MIN_VAL &&
        admin1SecondLetter <= _ASCII_CAP_LETTER_MAX_VAL,
      "Invalid ASCII"
    );

    uint256 methodologyData = (params.methodology << 4) |
      params.methodologyVersion;

    return
      (uint256(params.idVersion) << (_ID_VERSION_OFFSET * _BITS_PER_BYTE)) |
      (uint256(methodologyData) <<
        (_METHODOLOGY_DATA_OFFSET * _BITS_PER_BYTE)) |
      (uint256(params.vintage) << (_VINTAGE_OFFSET * _BITS_PER_BYTE)) |
      (uint256(uint16(params.country)) <<
        (_COUNTRY_CODE_OFFSET * _BITS_PER_BYTE)) |
      (uint256(uint16(params.admin1)) <<
        (_ADMIN1_CODE_OFFSET * _BITS_PER_BYTE)) |
      (uint256(uint160(params.supplierAddress)) <<
        (_ADDRESS_OFFSET * _BITS_PER_BYTE)) |
      (uint256(params.subIdentifier) << (_SUBID_OFFSET * _BITS_PER_BYTE));
  }

  function unpackRemovalId(uint256 removalId)
    internal
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return
      UnpackedRemovalIdV0(
        version(removalId),
        methodology(removalId),
        methodologyVersion(removalId),
        vintage(removalId),
        countryCode(removalId),
        admin1Code(removalId),
        supplierAddress(removalId),
        subIdentifier(removalId)
      );
  }

  function version(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue(removalId, _ID_VERSION_FIELD_LENGTH, _ID_VERSION_OFFSET)
      );
  }

  function methodology(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue(
          removalId,
          _METHODOLOGY_DATA_FIELD_LENGTH,
          _METHODOLOGY_DATA_OFFSET
        ) >> 4
      ); // methodology encoded in the first nibble
  }

  function methodologyVersion(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue(
          removalId,
          _METHODOLOGY_DATA_FIELD_LENGTH,
          _METHODOLOGY_DATA_OFFSET
        ) & (2**4 - 1)
      ); // methodology version encoded in the second nibble
  }

  function vintage(uint256 removalId) internal pure returns (uint16) {
    return
      uint16(_extractValue(removalId, _VINTAGE_FIELD_LENGTH, _VINTAGE_OFFSET));
  }

  function countryCode(uint256 removalId) internal pure returns (bytes2) {
    return
      bytes2(
        uint16(
          _extractValue(
            removalId,
            _COUNTRY_CODE_FIELD_LENGTH,
            _COUNTRY_CODE_OFFSET
          )
        )
      );
  }

  function admin1Code(uint256 removalId) internal pure returns (bytes2) {
    return
      bytes2(
        uint16(
          _extractValue(
            removalId,
            _ADMIN1_CODE_FIELD_LENGTH,
            _ADMIN1_CODE_OFFSET
          )
        )
      );
  }

  function supplierAddress(uint256 removalId) internal pure returns (address) {
    return
      address(
        uint160(
          _extractValue(removalId, _ADDRESS_FIELD_LENGTH, _ADDRESS_OFFSET)
        )
      );
  }

  function subIdentifier(uint256 removalId) internal pure returns (uint32) {
    return uint32(_extractValue(removalId, _SUBID_FIELD_LENGTH, _SUBID_OFFSET));
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
