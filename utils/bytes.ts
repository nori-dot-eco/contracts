/**
 * Takes a string of ascii characters and returns the corresponding 0x-prefixed hex string.
 *
 * @returns The hex representation of an ascii string.
 */
export const asciiStringToHexString = (asciiString: string): string => {
  const bytes = [];
  for (let index = 0; index < asciiString.length; index += 1) {
    bytes.push(asciiString.charCodeAt(index));
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
  let asciiString = '';
  for (let index = 0; index < hex.length; index += 2) {
    asciiString += String.fromCharCode(
      Number.parseInt(hex.slice(index, index + 2), 16)
    );
  }
  return asciiString;
};
