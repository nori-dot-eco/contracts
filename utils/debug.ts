import type { TracerEnv } from 'hardhat-tracer';

type DebugOptions = Partial<TracerEnv> & { verbose: boolean };

/** Wraps a function call in hardhat-tracer */
export const debug = async <T extends (...args: []) => any>(
  functionToDebug: T,
  options: DebugOptions = {} as DebugOptions
): Promise<Awaited<ReturnType<T>>> => {
  const tracerConfig = hre.tracer;
  const { enabled, verbose, calls, logs, sstores, sloads, gasCost } = options;
  hre.tracer.enabled = Boolean(enabled) || verbose;
  hre.tracer.calls = Boolean(calls) || verbose;
  hre.tracer.logs = Boolean(logs) || verbose;
  hre.tracer.sstores = Boolean(sstores) || verbose;
  hre.tracer.sloads = Boolean(sloads) || verbose;
  hre.tracer.gasCost = Boolean(gasCost) || verbose;
  const result = await functionToDebug();
  hre.tracer.enabled = false;
  hre.tracer = tracerConfig;
  return result;
};
