# Action Minecraft Bedrock Diagnose

Tests the content of your minecraft project for errors and outputs them to the action console as well as mark it as failed.

## Example


```yml
# This is a basic workflow to help you get started with Actions
name: minecraft-bedrock-diagnose

# Controls when the action will run. 
on:
  # Triggers the workflow on push or pull request events but only for the main branch
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
  test:
    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      - uses: actions/checkout@v2.3.4

      # Runs a single command using the runners shell
      - uses: Blockception/action-minecraft-bedrock-diagnose@v1.0.0
        with: 
          folder: ${{github.workspace}}/project