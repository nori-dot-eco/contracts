/**
 * Takes a string of ascii characters and returns the corresponding 0x-prefixed hex string.
 *
 * @returns The hex representation of an ascii string.
 */
export const asciiStringToHexString = (string_: string): string => {
  const bytes = [];
  for (let index = 0; index < string_.length; index++) {
    bytes.push(string_.charCodeAt(index));
  }
  return `0x${Array.from(bytes, (byte: number) => {
    // eslint-disable-next-line no-bitwise
    return (byte & 0xff).toString(16);
  }).join('')}`;
};

/**
 * Takes an optionally 0x-prefixed hex string and returns the ascii string.
 *
 * @returns The ascii representation of a hex string.
 */
export const hexStringToAsciiString = (hex: string): string => {
  hex = hex.replace('0x', '');
  let string_ = '';
  for (let index = 0; index < hex.length; index += 2) {
    string_ += String.fromCharCode(
      Number.parseInt(hex.slice(index, index + 2), 16)
    );
  }
  return string_;
};
