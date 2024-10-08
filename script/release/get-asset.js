const { Octokit } = require('@octokit/rest');
const got = require('got');

const octokit = new Octokit({
  userAgent: 'electron-asset-fetcher',
  auth: process.env.ELECTRON_GITHUB_TOKEN
});

async function getAssetContents (repo, assetId) {
  const requestOptions = octokit.repos.getReleaseAsset.endpoint({
    owner: 'electron',
    repo,
    asset_id: assetId,
    headers: {
      Accept: 'application/octet-stream'
    }
  });

  const { url, headers } = requestOptions;
  headers.authorization = `token ${process.env.ELECTRON_GITHUB_TOKEN}`;

  const response = await got(url, {
    followRedirect: false,
    method: 'HEAD',
    headers,
    throwHttpErrors: false
  });

  if (response.statusCode !== 302 && response.statusCode !== 301) {
    console.error('Failed to HEAD github asset contents for redirect: ' + url);
    throw new Error('Unexpected status HEAD\'ing github asset for redirect: ' + response.statusCode);
  }

  if (!response.headers.location) {
    console.error(response.headers, `${response.body}`.slice(0, 300));
    throw new Error(`cannot find asset[${assetId}], asset download did not redirect`);
  }

  const fileResponse = await got(response.headers.location, {
    throwHttpErrors: false
  });

  if (fileResponse.statusCode !== 200) {
    console.error(fileResponse.headers, `${fileResponse.body}`.slice(0, 300));
    throw new Error(`cannot download asset[${assetId}] from ${response.headers.location}, got status: ${fileResponse.statusCode}`);
  }

  return fileResponse.body;
}

module.exports = {
  getAssetContents
};
