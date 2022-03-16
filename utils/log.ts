export const trace = (...consoleArgs: unknown[]): void => {
  if (
    Boolean(process.env.TRACE) &&
    process.env.TRACE?.toLowerCase() !== 'false'
  )
    console.trace(...consoleArgs);
};
