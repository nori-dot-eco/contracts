// todo use in chai matcher (need to also detect internal big numbers and use different eq checker)
/** Converts an ethers struct into an object */
export const convertStructToObject = <T>(
  struct: T
): Omit<
  T,
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | keyof []
> => {
  const entries = Object.entries(struct);
  return Object.fromEntries(
    entries.slice(entries.length / 2, entries.length)
  ) as T;
};
