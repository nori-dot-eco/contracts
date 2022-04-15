/**
 * Takes a string of ascii characters and returns the corresponding 0x-prefixed hex string.
 *
 * @returns The hex representation of an ascii string.
 */
export const asciiStringToHexString = (str: string): string => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
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
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return str;
};
