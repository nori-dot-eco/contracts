import 'hardhat/types/runtime';

import type { trace, log, getLogger, debug } from '.';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    /**
     * @deprecated use hre.logger instead
     */
    log: typeof log;
    /**
     * @deprecated use hre.logger instead
     */
    trace: typeof trace;
    /**
     * @deprecated use hre.logger instead
     */
    debug: typeof debug;
    /**
     * @deprecated use hre.logger instead
     */
    getLogger: typeof getLogger;
    logger: ReturnType<typeof getLogger>;
  }
}
