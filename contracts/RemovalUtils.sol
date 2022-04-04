// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

struct UnpackedRemovalId {
  address supplierAddress;
  // TODO
}

uint256 constant _BITS_PER_BYTE = 8;
uint256 constant _ADDRESS_FIELD_LENGTH = 20;
uint256 constant _ADDRESS_OFFSET = 12;
uint256 constant _PARCEL_ID_FIELD_LENGTH = 5;
uint256 constant _PARCEL_ID_OFFSET = 7;
uint256 constant _VINTAGE_FIELD_LENGTH = 2;
uint256 constant _VINTAGE_OFFSET = 5;
uint256 constant _COUNTRY_CODE_FIELD_LENGTH = 2;
uint256 constant _COUNTRY_CODE_OFFSET = 3;
uint256 constant _ADMIN1_CODE_FIELD_LENGTH = 2;
uint256 constant _ADMIN1_CODE_OFFSET = 1;
uint256 constant _METHODOLOGY_DATA_FIELD_LENGTH = 1;
uint256 constant _METHODOLOGY_DATA_OFFSET = 0;

/**
 * @dev Library encapsulating the logic around decoding removal token ids.
 *
 * The token ids used for a given ERC1155 token in Removal.sol encode information about the carbon removal
 * in the following format:
 * TODO: is this up to date?
 *
 * [---------- 20 bytes---------- ][----5 bytes----][--2 bytes--][--2 bytes--][--2 bytes--][1byte]
 *  ------ supplier address -----------parcel id------ vintage------country------admin1-----meth & version
 *
 * TODO: should these functions be internal? public?
 * NOTE: All methods are internal so this library gets inlined into the consuming
 * contract and does not need to be deployed separately.
 *
 * TODO update for removal utils
 * Designed to be used i.e.:
 *
 * ```
 *  using RemovalUtils for Schedule;
 *
 *  mapping(address => Schedule) schedules = Schedules;
 *  Schedule s = schedules[account];
 *  s.startTime = 1644436100;
 *  s.endTime = 1645436100;
 *  s.totalAmount = 1000000;
 *  s.addCliff(1644436200, 50000);
 *  s.amountAvailable(1644436200);
 * ```
 *
 */
library RemovalUtils {
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
