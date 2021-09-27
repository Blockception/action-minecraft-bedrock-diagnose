import { BehaviorPack, Pack, ResourcePack } from "bc-minecraft-bedrock-project";
import { Context, CreateDiagnoser } from "./diagnoser";
import { MinecraftFormat } from "./minecraft/format";

import * as core from "@actions/core";

export function diagnose(folder: string): void {
  core.info("diagnosing folder: " + folder);
  const context = CreateDiagnoser(folder);

  console.log();
  const manifests = MinecraftFormat.GetManifests(folder, context.project.ignores.patterns);
  const pack = context.data.addPack(manifests, context.project);

  //Process file
  const packdata = pack.map((p) => process_pack(p, context));

  //Diagnose files
  packdata.forEach((p) => diagnose_pack(p, context));
}

type PackFiles = { pack: Pack; files: string[] };

function process_pack(pack: Pack, context: Context): PackFiles {
  console.log("Processing pack: " + pack.folder);

  let files: string[];

  if (BehaviorPack.BehaviorPack.is(pack)) {
    files = MinecraftFormat.GetBehaviorPackFiles(pack.folder, pack.context.ignores.patterns);
  } else if (ResourcePack.ResourcePack.is(pack)) {
    files = MinecraftFormat.GetBehaviorPackFiles(pack.folder, pack.context.ignores.patterns);
  } else {
    files = MinecraftFormat.GetPackFiles(pack);
  }

  const out = { pack: pack, files: files };

  //Process each file
  files.forEach((filepath) => process_file(filepath, pack, context));

  return out;
}

function process_file(file: string, pack: Pack, context: Context): void {
  try {
    const doc = context.getDocument(file);
    if (doc) {
      core.info("Processing file: " + doc.uri);
      pack.process(doc);
    }
  } catch (err) {
    core.error(err);
  }
}

function diagnose_pack(data: PackFiles, context: Context): void {
  core.info("Diagnosing pack: " + data.pack.folder);

  data.files.forEach((filepath) => diagnose_file(filepath, context));
}

function diagnose_file(filepath: string, context: Context): void {
  core.info("Diagnosing file: " + filepath);

  try {
    context.diagnoser.Process(filepath);
  } catch (err) {
    core.error(err);
  }
}
