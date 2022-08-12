// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "./Errors.sol";

struct DecodedRemovalIdV0 {
  uint8 idVersion;
  uint8 methodology;
  uint8 methodologyVersion;
  uint16 vintage;
  bytes2 country;
  bytes2 subdivision;
  address supplierAddress;
  uint32 subIdentifier;
}

uint256 constant _BITS_PER_BYTE = 8;
uint256 constant _ENCODED_LENGTH_BYTES_DECODED_ID_V0 = 256;

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
 * The token IDs used for a given ERC1155 token in Removal encode information about the carbon removal in the following
 * format(s), where the first byte encodes the format version:
 *
 * Version 0:
 * [1byte][1byte][--2 bytes--][--2 bytes--][--2 bytes--][----------- 20 bytes------------- ][------4 bytes------]
 * tokIdV--meth&v---vintage------country------subdivision------------ supplier address --------------subidentifier--
 *
 * For methodology 1 (regenerative ag), the subidentifier serves as a parcel identifier.
 */
library RemovalIdLib {
  using RemovalIdLib for DecodedRemovalIdV0;

  function isCapitalized(bytes2 characters) internal pure returns (bool valid) {
    assembly {
      let firstCharacter := byte(0, characters)
      let secondCharacter := byte(1, characters)
      valid := and(
        and(lt(firstCharacter, 0x5B), gt(firstCharacter, 0x40)),
        and(lt(secondCharacter, 0x5B), gt(secondCharacter, 0x40))
      )
    }
  }

  function validate(DecodedRemovalIdV0 memory removal) internal pure {
    if (removal.idVersion != 0) {
      revert UnsupportedIdVersion({idVersion: removal.idVersion});
    }
    if (removal.methodologyVersion > 15) {
      revert MethodologyVersionTooLarge({
        methodologyVersion: removal.methodologyVersion
      });
    }
    if (
      !(isCapitalized(removal.country) && isCapitalized(removal.subdivision))
    ) {
      revert UncapitalizedString({
        country: removal.country,
        subdivision: removal.subdivision
      });
    }
  }

  /**
   * @notice Packs data about a removal into a 256-bit token id for the removal.
   * @dev Performs some possible validations on the data before attempting to create the id.
   *
   * @param removal removal data struct to be packed into a uint256 ID
   */
  function createRemovalId(
    DecodedRemovalIdV0 memory removal // todo rename create
  ) internal pure returns (uint256) {
    removal.validate();
    uint256 methodologyData = (removal.methodology << 4) |
      removal.methodologyVersion;
    return
      (uint256(removal.idVersion) << (_ID_VERSION_OFFSET * _BITS_PER_BYTE)) |
      (uint256(methodologyData) <<
        (_METHODOLOGY_DATA_OFFSET * _BITS_PER_BYTE)) |
      (uint256(removal.vintage) << (_VINTAGE_OFFSET * _BITS_PER_BYTE)) |
      (uint256(uint16(removal.country)) <<
        (_COUNTRY_CODE_OFFSET * _BITS_PER_BYTE)) |
      (uint256(uint16(removal.subdivision)) <<
        (_ADMIN1_CODE_OFFSET * _BITS_PER_BYTE)) |
      (uint256(uint160(removal.supplierAddress)) <<
        (_ADDRESS_OFFSET * _BITS_PER_BYTE)) |
      (uint256(removal.subIdentifier) << (_SUBID_OFFSET * _BITS_PER_BYTE));
  }

  /**
   * @notice Unpacks a V0 removal id into its component data.
   */
  function decodeRemovalIdV0(uint256 removalId)
    internal
    pure
    returns (DecodedRemovalIdV0 memory)
  {
    return
      DecodedRemovalIdV0(
        version(removalId),
        methodology(removalId),
        methodologyVersion(removalId),
        vintage(removalId),
        countryCode(removalId),
        subdivisionCode(removalId),
        supplierAddress(removalId),
        subIdentifier(removalId)
      );
  }

  /**
   * @notice Extracts and returns the version field of a removal token id.
   */
  function version(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue(removalId, _ID_VERSION_FIELD_LENGTH, _ID_VERSION_OFFSET)
      );
  }

  /**
   * @notice Extracts and returns the methodology field of a removal token id.
   */
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

  /**
   * @notice Extracts and returns the methodology version field of a removal token id.
   */
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

  /**
   * @notice Extracts and returns the vintage field of a removal token id.
   */
  function vintage(uint256 removalId) internal pure returns (uint16) {
    return
      uint16(_extractValue(removalId, _VINTAGE_FIELD_LENGTH, _VINTAGE_OFFSET));
  }

  /**
   * @notice Extracts and returns the country code field of a removal token id.
   */
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

  /**
   * @notice Extracts and returns the subdivision field of a removal token id.
   */
  function subdivisionCode(uint256 removalId) internal pure returns (bytes2) {
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

  /**
   * @notice Extracts and returns the supplier address field of a removal token ID.
   */
  function supplierAddress(uint256 removalId) internal pure returns (address) {
    return
      address(
        uint160(
          _extractValue(removalId, _ADDRESS_FIELD_LENGTH, _ADDRESS_OFFSET)
        )
      );
  }

  /**
   * @notice Extracts and returns the subIdentifier field of a removal token id.
   */
  function subIdentifier(uint256 removalId) internal pure returns (uint32) {
    return uint32(_extractValue(removalId, _SUBID_FIELD_LENGTH, _SUBID_OFFSET));
  }

  /**
   * @dev Extracts a field of the specified length in bytes, at the specified location, from a removal id.
   */
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
