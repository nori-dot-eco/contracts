import { Octokit } from '@octokit/rest';

export const getOctokit = (): Octokit => {
  if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    throw new Error(
      'GITHUB_PERSONAL_ACCESS_TOKEN is not set in your environment'
    );
  }
  const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  });
  return octokit;
};
