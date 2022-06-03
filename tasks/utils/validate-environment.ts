export const validateTestEnvironment = ({
  reportGas,
}: {
  reportGas?: boolean;
}): void => {
  const { MINT, FORCE_PROXY_DEPLOYMENT, ETHERNAL, REPORT_GAS, TENDERLY } =
    process.env;
  if (MINT) {
    hre.log(
      'process.env.MINT is not set to false, forcing it to be false anyways.',
      `Previous value: ${MINT}`
    );
    process.env.MINT = false;
  }
  if (!FORCE_PROXY_DEPLOYMENT) {
    hre.log(
      'process.env.FORCE_PROXY_DEPLOYMENT is not set to true, forcing it to be true anyways.',
      `Previous value: ${FORCE_PROXY_DEPLOYMENT}`
    );
    process.env.FORCE_PROXY_DEPLOYMENT = true;
  }
  if (ETHERNAL) {
    hre.log(
      'process.env.ETHERNAL is not set to false, forcing it to be false anyways.',
      `Previous value: ${ETHERNAL}`
    );
    process.env.ETHERNAL = false;
  }
  if (Boolean(reportGas) || REPORT_GAS) {
    hre.log(
      'Setting process.env.REPORT_GAS to true',
      `Previous value: ${REPORT_GAS}`
    );
    process.env.REPORT_GAS = true;
  }
  if (TENDERLY) {
    hre.log(
      'Setting process.env.TENDERLY to false',
      `Previous value: ${TENDERLY}`
    );
    process.env.TENDERLY = false;
  }
};
