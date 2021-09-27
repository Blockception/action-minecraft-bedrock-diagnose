import * as core from "@actions/core";
import { diagnose } from "./diagnose/entry";

//Start code
try {
  // This should be a token with access to your repository scoped in as a secret.
  // The YML workflow will need to set myToken with the GitHub Secret Token
  // token: ${{ secrets.GITHUB_TOKEN }}
  const Folder = core.getInput("folder");

  diagnose(Folder);

  //If failed
} catch (error) {
  core.setFailed(error);
}
