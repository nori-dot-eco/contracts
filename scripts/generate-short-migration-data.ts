/**
 * This script generates short migration data files from production data.
 * In order to work, we require the `prepared-removals.json` and `prepared-certificates.json` files that
 * are generated from the datastore, as well as the `migrated-removals.json` file that is generated from
 * minting the prepared removals, since this file contains the link between the removal token ids that are
 * generated during minting and the mintable project to which the removals belong.
 *
 * The intended use of this file is to use a local hardhat node to generate the `migrated-removals.json` file quickly,
 * and from that we can quickly generate short migration data files of any length for the purpose of testing on Mumbai.
 */

import { readJsonSync, writeJsonSync } from 'fs-extra';

// set me ===============================================
const NUMBER_CERTS_TO_MIGRATE = 10;
// ======================================================
const INPUT_CERT_FILE = '../../prepared-certificates.json';
const INPUT_REMOVAL_FILE = '../../prepared-removals.json';
const MIGRATED_REMOVALS_FILE = 'migrated-removals.json';
const OUTPUT_CERT_FILE = `prepared-certificates-short-${NUMBER_CERTS_TO_MIGRATE}.json`;
const OUTPUT_REMOVAL_FILE = `prepared-removals-short-${NUMBER_CERTS_TO_MIGRATE}.json`;

console.log('Generating short migration data...');
const allCertificateData = readJsonSync(INPUT_CERT_FILE);
const certificatesToMint = allCertificateData.slice(0, NUMBER_CERTS_TO_MIGRATE);
writeJsonSync(OUTPUT_CERT_FILE, certificatesToMint);

const requiredRemovalIds = new Set();
for (const cert of certificatesToMint) {
  for (const id of cert.ids) requiredRemovalIds.add(id);
}

const allProjects = readJsonSync(INPUT_REMOVAL_FILE);
const allProjectsWithTokenIdData = readJsonSync(MIGRATED_REMOVALS_FILE);
const projectsToMint = [];
const projectIndicesToMint = [];
for (const [index, project] of allProjectsWithTokenIdData.entries()) {
  for (const id of project.tokenIds) {
    if (requiredRemovalIds.has(id)) {
      projectsToMint.push(allProjects[index]);
      projectIndicesToMint.push(index);
      break;
    }
  }
}
writeJsonSync(OUTPUT_REMOVAL_FILE, projectsToMint);
console.log('Wrote outputs to', OUTPUT_CERT_FILE, 'and', OUTPUT_REMOVAL_FILE);
console.log(`Will migrate the first ${NUMBER_CERTS_TO_MIGRATE} certificates`);
console.log('This requires minting projects:', projectIndicesToMint);
