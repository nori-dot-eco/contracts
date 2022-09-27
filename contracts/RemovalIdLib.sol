// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {UnsupportedIdVersion, MethodologyVersionTooLarge, MethodologyTooLarge, UncapitalizedString} from "./Errors.sol";

/**
 * @notice Decoded removal data.
 * @dev Every removal is minted using this struct. The struct then undergoes bit-packing to create the removal ID.
 * @param idVersion The removal ID version.
 * @param methodology The removal's methodology type.
 * @param methodologyVersion The removal methodology type's version.
 * @param vintage The vintage of the removal.
 * @param country The country that the removal occurred in.
 * @param subdivision The subdivision of the country that the removal occurred in.
 * @param supplierAddress The supplier's original wallet address.
 * @param subIdentifier A unique sub-identifier (e.g., the parcel/field identifier).
 */
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

/**
 * @title A library for working with Removal IDs.
 * @author Nori Inc.
 * @notice Library encapsulating the logic around encoding and decoding removal IDs.
 * @dev The token IDs used for a given ERC1155 token in Removal encode information about the carbon removal in the
 * following format(s), where the first byte encodes the format version:
 *
 * ##### Removal ID Version 0:
 *
 * | Bytes Label | Description                                                 |
 * | ----------- | ----------------------------------------------------------- |
 * | tokIdV      | The token/removal ID version.                               |
 * | meth&v      | The removal's methodology version.                          |
 * | vintage     | The vintage of the removal.                                 |
 * | country     | The country that the removal occurred in.                   |
 * | subdiv      | The subdivision of the country that the removal occurred in.|
 * | supplier    | The supplier's original wallet address.                     |
 * | subid       | A unique sub-identifier (e.g., the parcel/field identifier).|
 *
 * | tokIdV | meth&v | vintage | country | subdiv  | supplier | subid   |
 * | ------ | ------ | ------- | ------- | ------- | -------- | ------- |
 * | 1 byte | 1 byte | 2 bytes | 2 bytes | 2 bytes | 20 bytes | 4 bytes |
 */
library RemovalIdLib {
  using RemovalIdLib for DecodedRemovalIdV0;

  /**
   * @notice The number of bits per byte.
   */
  uint256 public constant BITS_PER_BYTE = 8;
  /**
   * @notice The number of bytes allocated to the token/removal ID version.
   */
  uint256 public constant ID_VERSION_FIELD_LENGTH = 1;
  /**
   * @notice The number of bytes allocated to the methodology version.
   */
  uint256 public constant METHODOLOGY_DATA_FIELD_LENGTH = 1;
  /**
   * @notice The number of bytes allocated to the vintage.
   */
  uint256 public constant VINTAGE_FIELD_LENGTH = 2;
  /**
   * @notice The number of bytes allocated to the ISO 3166-2 country code.
   */
  uint256 public constant COUNTRY_CODE_FIELD_LENGTH = 2;
  /**
   * @notice The number of bytes allocated to the administrative region of the ISO 3166-2 subdivision.
   */
  uint256 public constant ADMIN1_CODE_FIELD_LENGTH = 2;
  /**
   * @notice The number of bytes allocated to the supplier's original wallet address.
   */
  uint256 public constant ADDRESS_FIELD_LENGTH = 20;
  /**
   * @notice The number of bytes allocated to the sub-identifier.
   */
  uint256 public constant SUBID_FIELD_LENGTH = 4;
  /**
   * @notice The bit offset of the ID version.
   */
  uint256 public constant ID_VERSION_OFFSET = 31;
  /**
   * @notice The bit offset of the methodology data.
   */
  uint256 public constant METHODOLOGY_DATA_OFFSET = 30;
  /**
   * @notice The bit offset of the vintage.
   */
  uint256 public constant VINTAGE_OFFSET = 28;
  /**
   * @notice The bit offset of the country code.
   */
  uint256 public constant COUNTRY_CODE_OFFSET = 26;
  /**
   * @notice The bit offset of the administrative region code.
   */
  uint256 public constant ADMIN1_CODE_OFFSET = 24;
  /**
   * @notice The bit offset of the original supplier wallet address.
   */
  uint256 public constant ADDRESS_OFFSET = 4;
  /**
   * @notice The bit offset of the sub-identifier.
   */
  uint256 public constant SUBID_OFFSET = 0;

  /**
   * @notice Check whether the provided character bytes are capitalized.
   * @param characters the character bytes to check.
   * @return valid True if the provided character bytes are capitalized, false otherwise.
   */
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

  /**
   * @notice Validate the removal struct.
   * @param removal The removal struct to validate.
   */
  function validate(DecodedRemovalIdV0 memory removal) internal pure {
    if (removal.idVersion != 0) {
      revert UnsupportedIdVersion({idVersion: removal.idVersion});
    }
    if (removal.methodologyVersion > 15) {
      revert MethodologyVersionTooLarge({
        methodologyVersion: removal.methodologyVersion
      });
    }
    if (removal.methodology > 15) {
      revert MethodologyTooLarge({methodology: removal.methodology});
    }
    if (
      !(isCapitalized({characters: removal.country}) &&
        isCapitalized({characters: removal.subdivision}))
    ) {
      revert UncapitalizedString({
        country: removal.country,
        subdivision: removal.subdivision
      });
    }
  }

  /**
   * @notice Packs data about a removal into a 256-bit removal ID for the removal.
   * @dev Performs some possible validations on the data before attempting to create the ID.
   * @param removal A removal in `DecodedRemovalIdV0` notation.
   * @return The removal ID.
   */
  function createRemovalId(
    DecodedRemovalIdV0 memory removal // todo rename create
  ) internal pure returns (uint256) {
    removal.validate();
    uint256 methodologyData = (removal.methodology << 4) |
      removal.methodologyVersion;
    return
      (uint256(removal.idVersion) << (ID_VERSION_OFFSET * BITS_PER_BYTE)) |
      (uint256(methodologyData) << (METHODOLOGY_DATA_OFFSET * BITS_PER_BYTE)) |
      (uint256(removal.vintage) << (VINTAGE_OFFSET * BITS_PER_BYTE)) |
      (uint256(uint16(removal.country)) <<
        (COUNTRY_CODE_OFFSET * BITS_PER_BYTE)) |
      (uint256(uint16(removal.subdivision)) <<
        (ADMIN1_CODE_OFFSET * BITS_PER_BYTE)) |
      (uint256(uint160(removal.supplierAddress)) <<
        (ADDRESS_OFFSET * BITS_PER_BYTE)) |
      (uint256(removal.subIdentifier) << (SUBID_OFFSET * BITS_PER_BYTE));
  }

  /**
   * @notice Unpacks a V0 removal ID into its component data.
   * @param removalId The removal ID to unpack.
   * @return The removal ID in `DecodedRemovalIdV0` notation.
   */
  function decodeRemovalIdV0(uint256 removalId)
    internal
    pure
    returns (DecodedRemovalIdV0 memory)
  {
    return
      DecodedRemovalIdV0(
        version({removalId: removalId}),
        methodology({removalId: removalId}),
        methodologyVersion({removalId: removalId}),
        vintage({removalId: removalId}),
        countryCode({removalId: removalId}),
        subdivisionCode({removalId: removalId}),
        supplierAddress({removalId: removalId}),
        subIdentifier({removalId: removalId})
      );
  }

  /**
   * @notice Extracts and returns the version field of a removal ID.
   * @param removalId The removal ID to extract the version field from.
   * @return The version field of the removal ID.
   */
  function version(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue({
          removalId: removalId,
          numBytesFieldLength: ID_VERSION_FIELD_LENGTH,
          numBytesOffsetFromRight: ID_VERSION_OFFSET
        })
      );
  }

  /**
   * @notice Extracts and returns the methodology field of a removal ID.
   * @param removalId The removal ID to extract the methodology field from.
   * @return The methodology field of the removal ID.
   */
  function methodology(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue({
          removalId: removalId,
          numBytesFieldLength: METHODOLOGY_DATA_FIELD_LENGTH,
          numBytesOffsetFromRight: METHODOLOGY_DATA_OFFSET
        }) >> 4
      ); // methodology encoded in the first nibble
  }

  /**
   * @notice Extracts and returns the methodology version field of a removal ID.
   * @param removalId The removal ID to extract the methodology version field from.
   * @return The methodology version field of the removal ID.
   */
  function methodologyVersion(uint256 removalId) internal pure returns (uint8) {
    return
      uint8(
        _extractValue({
          removalId: removalId,
          numBytesFieldLength: METHODOLOGY_DATA_FIELD_LENGTH,
          numBytesOffsetFromRight: METHODOLOGY_DATA_OFFSET
        }) & (2**4 - 1)
      ); // methodology version encoded in the second nibble
  }

  /**
   * @notice Extracts and returns the vintage field of a removal ID.
   * @param removalId The removal ID to extract the vintage field from.
   * @return The vintage field of the removal ID.
   */
  function vintage(uint256 removalId) internal pure returns (uint16) {
    return
      uint16(
        _extractValue({
          removalId: removalId,
          numBytesFieldLength: VINTAGE_FIELD_LENGTH,
          numBytesOffsetFromRight: VINTAGE_OFFSET
        })
      );
  }

  /**
   * @notice Extracts and returns the country code field of a removal ID.
   * @param removalId The removal ID to extract the country code field from.
   * @return The country code field of the removal ID.
   */
  function countryCode(uint256 removalId) internal pure returns (bytes2) {
    return
      bytes2(
        uint16(
          _extractValue({
            removalId: removalId,
            numBytesFieldLength: COUNTRY_CODE_FIELD_LENGTH,
            numBytesOffsetFromRight: COUNTRY_CODE_OFFSET
          })
        )
      );
  }

  /**
   * @notice Extracts and returns the subdivision field of a removal ID.
   * @param removalId The removal ID to extract the subdivision field from.
   * @return The subdivision field of the removal ID.
   */
  function subdivisionCode(uint256 removalId) internal pure returns (bytes2) {
    return
      bytes2(
        uint16(
          _extractValue({
            removalId: removalId,
            numBytesFieldLength: ADMIN1_CODE_FIELD_LENGTH,
            numBytesOffsetFromRight: ADMIN1_CODE_OFFSET
          })
        )
      );
  }

  /**
   * @notice Extracts and returns the supplier address field of a removal ID.
   * @param removalId The removal ID to extract the supplier address field from.
   * @return The supplier address field of the removal ID.
   */
  function supplierAddress(uint256 removalId) internal pure returns (address) {
    return
      address(
        uint160(
          _extractValue({
            removalId: removalId,
            numBytesFieldLength: ADDRESS_FIELD_LENGTH,
            numBytesOffsetFromRight: ADDRESS_OFFSET
          })
        )
      );
  }

  /**
   * @notice Extract and returns the `subIdentifier` field of a removal ID.
   * @param removalId The removal ID to extract the sub-identifier field from.
   * @return The sub-identifier field of the removal ID.
   */
  function subIdentifier(uint256 removalId) internal pure returns (uint32) {
    return
      uint32(
        _extractValue({
          removalId: removalId,
          numBytesFieldLength: SUBID_FIELD_LENGTH,
          numBytesOffsetFromRight: SUBID_OFFSET
        })
      );
  }

  /**
   * @notice Extract a field of the specified length in bytes, at the specified location, from a removal ID.
   * @param removalId The removal ID to extract the field from.
   * @param numBytesFieldLength The number of bytes in the field to extract.
   * @param numBytesOffsetFromRight The number of bytes to offset the field from the right.
   * @return The extracted field value.
   */
  function _extractValue(
    uint256 removalId,
    uint256 numBytesFieldLength,
    uint256 numBytesOffsetFromRight
  ) private pure returns (uint256) {
    bytes32 mask = bytes32(2**(numBytesFieldLength * BITS_PER_BYTE) - 1) <<
      (numBytesOffsetFromRight * BITS_PER_BYTE);
    bytes32 maskedValue = bytes32(removalId) & mask;
    return uint256(maskedValue >> (numBytesOffsetFromRight * BITS_PER_BYTE));
  }
}
