// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

struct UnpackedRemovalId {
  address supplierAddress;
  // TODO create and use a struct for args?
}

uint256 constant _BITS_PER_BYTE = 8;

uint256 constant _TOKEN_ID_VERSION_FIELD_LENGTH = 1;
uint256 constant _METHODOLOGY_DATA_FIELD_LENGTH = 1;
uint256 constant _VINTAGE_FIELD_LENGTH = 2;
uint256 constant _COUNTRY_CODE_FIELD_LENGTH = 2;
uint256 constant _ADMIN1_CODE_FIELD_LENGTH = 2;
uint256 constant _ADDRESS_FIELD_LENGTH = 20;
uint256 constant _PARCEL_ID_FIELD_LENGTH = 4;

uint256 constant _TOKEN_ID_VERSION_OFFSET = 31;
uint256 constant _METHODOLOGY_DATA_OFFSET = 30;
uint256 constant _VINTAGE_OFFSET = 28;
uint256 constant _COUNTRY_CODE_OFFSET = 26;
uint256 constant _ADMIN1_CODE_OFFSET = 24;
uint256 constant _ADDRESS_OFFSET = 4;
uint256 constant _PARCEL_ID_OFFSET = 0;

/**
 * @dev Library encapsulating the logic around encoding and decoding removal token ids.
 *
 * The token ids used for a given ERC1155 token in Removal.sol encode information about the carbon removal
 * in the following format:
 *
 * [1byte][1byte][--2 bytes--][--2 bytes--][--2 bytes--][----------- 20 bytes------------- ][------4 bytes------]
 * tokIdV--meth&v---vintage------country------admin1------------ supplier address --------------parcel id------
 *
 *
 */
library RemovalUtils {
  function createTokenIdV0(
    uint256 methodology,
    uint256 methodologyVersion,
    uint256 vintage,
    string memory country,
    string memory admin1,
    address supplierAddress,
    uint256 parcelId
  ) internal pure returns (uint256) {
    bytes memory countryBytes = bytes(country);
    bytes memory admin1Bytes = bytes(admin1);
    require(countryBytes.length == 2, "Country code must be two characters");
    require(admin1Bytes.length == 2, "Admin1 code must be two characters");
    uint256 methodologyData = (methodology << 4) | methodologyVersion;

    return
      0 |
      (methodologyData << (_METHODOLOGY_DATA_OFFSET * _BITS_PER_BYTE)) |
      (vintage << (_VINTAGE_OFFSET * _BITS_PER_BYTE)) |
      ((uint256(uint8(countryBytes[0])) <<
        (_COUNTRY_CODE_OFFSET * _BITS_PER_BYTE + _BITS_PER_BYTE)) |
        (uint256(uint8(countryBytes[1])) <<
          (_COUNTRY_CODE_OFFSET * _BITS_PER_BYTE))) |
      ((uint256(uint8(admin1Bytes[0])) <<
        (_ADMIN1_CODE_OFFSET * _BITS_PER_BYTE + _BITS_PER_BYTE)) |
        (uint256(uint8(admin1Bytes[1])) <<
          (_ADMIN1_CODE_OFFSET * _BITS_PER_BYTE))) |
      (uint256(uint160(supplierAddress)) <<
        (_ADDRESS_OFFSET * _BITS_PER_BYTE)) |
      (parcelId << (_PARCEL_ID_OFFSET * _BITS_PER_BYTE));
  }

  function versionFromTokenId(uint256 tokenId) internal pure returns (uint256) {
    return
      _extractValue(
        tokenId,
        _TOKEN_ID_VERSION_FIELD_LENGTH,
        _TOKEN_ID_VERSION_OFFSET
      );
  }

  function methodologyFromTokenId(uint256 tokenId)
    internal
    pure
    returns (uint256)
  {
    return
      _extractValue(
        tokenId,
        _METHODOLOGY_DATA_FIELD_LENGTH,
        _METHODOLOGY_DATA_OFFSET
      ) >> 4; // methodology encoded in the first nibble
  }

  function methodologyVersionFromTokenId(uint256 tokenId)
    internal
    pure
    returns (uint256)
  {
    return
      _extractValue(
        tokenId,
        _METHODOLOGY_DATA_FIELD_LENGTH,
        _METHODOLOGY_DATA_OFFSET
      ) & 7; // methodology version encoded in the second nibble
  }

  function vintageFromTokenId(uint256 tokenId) internal pure returns (uint256) {
    return _extractValue(tokenId, _VINTAGE_FIELD_LENGTH, _VINTAGE_OFFSET);
  }

  function countryCodeFromTokenId(uint256 tokenId)
    internal
    pure
    returns (string memory)
  {
    bytes32 extractedCode = bytes32(
      _extractValue(tokenId, _COUNTRY_CODE_FIELD_LENGTH, _COUNTRY_CODE_OFFSET)
    );
    bytes memory bytesArray = new bytes(2);
    bytesArray[0] = extractedCode[30];
    bytesArray[1] = extractedCode[31];
    return string(bytesArray);
  }

  function admin1CodeFromTokenId(uint256 tokenId)
    internal
    pure
    returns (string memory)
  {
    bytes32 extractedCode = bytes32(
      _extractValue(tokenId, _ADMIN1_CODE_FIELD_LENGTH, _ADMIN1_CODE_OFFSET)
    );
    bytes memory bytesArray = new bytes(2);
    bytesArray[0] = extractedCode[30];
    bytesArray[1] = extractedCode[31];
    return string(bytesArray);
  }

  function supplierAddressFromTokenId(uint256 tokenId)
    internal
    pure
    returns (address)
  {
    return
      address(
        uint160(_extractValue(tokenId, _ADDRESS_FIELD_LENGTH, _ADDRESS_OFFSET))
      );
  }

  function parcelIdFromTokenId(uint256 tokenId)
    internal
    pure
    returns (uint256)
  {
    return _extractValue(tokenId, _PARCEL_ID_FIELD_LENGTH, _PARCEL_ID_OFFSET);
  }

  function _extractValue(
    uint256 tokenId,
    uint256 numBytesFieldLength,
    uint256 numBytesOffsetFromRight
  ) private pure returns (uint256) {
    bytes32 mask = bytes32(2**(numBytesFieldLength * _BITS_PER_BYTE) - 1) <<
      (numBytesOffsetFromRight * _BITS_PER_BYTE);
    bytes32 maskedValue = bytes32(tokenId) & mask;
    return uint256(maskedValue >> (numBytesOffsetFromRight * _BITS_PER_BYTE));
  }
}
