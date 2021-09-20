import * as core from '@actions/core';

//Start code
try {
  // This should be a token with access to your repository scoped in as a secret.
  // The YML workflow will need to set myToken with the GitHub Secret Token
  // token: ${{ secrets.GITHUB_TOKEN }}
  const Folder = core.getInput('folder');
  var result = false;

  if (result) {
    console.log('success');
  }
  else {
    console.log('failure');
    core.setFailed('no pages were created');
  }

  //If failed
} catch (error) {
  let message: string;

  if (error.message)
    message = error.message;
  else
    message = JSON.stringify(error);

  if (core)
    core.setFailed(message);

  else {
    console.log(message);
    process.exit(1);
  }
}