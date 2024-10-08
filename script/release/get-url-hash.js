const got = require('got');
const url = require('node:url');

module.exports = async function getUrlHash (targetUrl, algorithm = 'sha256', attempts = 3) {
  const options = {
    code: process.env.ELECTRON_ARTIFACT_HASHER_FUNCTION_KEY,
    targetUrl,
    algorithm
  };
  const search = new url.URLSearchParams(options);
  const functionUrl = url.format({
    protocol: 'https:',
    hostname: 'electron-artifact-hasher.azurewebsites.net',
    pathname: '/api/HashArtifact',
    search: search.toString()
  });
  try {
    const resp = await got(functionUrl, {
      throwHttpErrors: false
    });
    if (resp.statusCode !== 200) {
      console.error('bad hasher function response:', resp.body.trim());
      throw new Error('non-200 status code received from hasher function');
    }
    if (!resp.body) throw new Error('Successful lambda call but failed to get valid hash');

    return resp.body.trim();
  } catch (err) {
    if (attempts > 1) {
      if (err.response?.body) {
        console.error(`Failed to get URL hash for ${targetUrl} - we will retry`, {
          statusCode: err.response.statusCode,
          body: JSON.parse(err.response.body)
        });
      } else {
        console.error(`Failed to get URL hash for ${targetUrl} - we will retry`, err);
      }
      return getUrlHash(targetUrl, algorithm, attempts - 1);
    }
    throw err;
  }
};
