const ENSRegistry = artifacts.require('@ensdomains/ens/ENSRegistry');
const FIFSRegistrar = artifacts.require('@ensdomains/ens/FIFSRegistrar');
const PublicResolver = artifacts.require('@ensdomains/resolver/PublicResolver');
const utils = require('web3-utils');
const namehash = require('eth-ens-namehash');

const TLD = 'eth'; // todo point to .test when on ropsten
const NAME = 'norimarket'; // todo point to nori when the reservation process finishes
const NAMEHASH = namehash.hash(`${NAME}.${TLD}`);

const setupResolver = async ({ ens, resolver, owner }) => {
  const resolverNode = namehash.hash(TLD);
  const resolverLabel = utils.sha3(TLD);
  await ens.setSubnodeOwner(
    '0x0000000000000000000000000000000000000000',
    resolverLabel,
    owner
  );
  await ens.setResolver(resolverNode, resolver.address);
  await resolver.setAddr(resolverNode, resolver.address);
};

const setupRegistrar = async ({ ens, registrar }) => {
  await ens.setSubnodeOwner(
    '0x0000000000000000000000000000000000000000',
    utils.sha3(TLD),
    registrar.address
  );
};

const setupDomain = async ({
  registrar,
  resolver,
  owner,
  addressToResolveTo,
}) => {
  await registrar.register(utils.sha3(NAME), owner);
  await resolver.setAddr(NAMEHASH, addressToResolveTo);
};

const setupSubDomain = async ({
  resolver,
  addressToResolveTo,
  subDomainNamehash,
}) => {
  await resolver.setAddr(subDomainNamehash, addressToResolveTo);
};

module.exports = (deployer, network, accounts) => {
  // todo only run this when running against a development network
  deployer.then(async () => {
    const ens = await deployer.deploy(ENSRegistry);
    const resolver = await deployer.deploy(PublicResolver, ens.address);
    await setupResolver({ ens, resolver, owner: accounts[0] });
    const registrar = await deployer.deploy(
      FIFSRegistrar,
      ens.address,
      namehash.hash(TLD)
    );
    await setupRegistrar({ ens, registrar });
    await setupDomain({
      registrar,
      resolver,
      owner: accounts[0],
      addressToResolveTo: accounts[1], // todo point to a more appropriate address
    });
    // todo use openzeppelin upgrade api
    // todo for each contract (i.e, CRC, supplier, verifier, etc):
    await setupSubDomain({
      resolver,
      addressToResolveTo: '0x0', // todo replace with openzeppelin address output
      subDomainNamehash: namehash.hash(`${NAME}.${TLD}`), // todo replace NAME with contract name
    });
  });
};
