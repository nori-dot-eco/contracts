export const generateRandomSubIdentifier = (): number =>
  Math.floor(Math.random() * (2 ** 32 - 1));
