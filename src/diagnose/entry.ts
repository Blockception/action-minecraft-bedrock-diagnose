import { BehaviorPack, Pack, ResourcePack } from "bc-minecraft-bedrock-project";
import { Context, CreateDiagnoser } from "./diagnoser";
import { MinecraftFormat } from "./minecraft/format";

import * as core from "@actions/core";

export function diagnose(folder: string): void {
  core.info("diagnosing folder: " + folder);

  core.summary.addHeading("Diagnostic report", 1);

  const context = CreateDiagnoser(folder);

  const manifests = MinecraftFormat.GetManifests(folder, context.project.ignores.patterns);
  const packs = manifests.map((m) => context.data.addPack(m, context.project)).filter((p) => p !== undefined);
  const packdata = packs.map((pack) => process_pack(pack, context))

  //Diagnose files
  packdata.forEach((p) => diagnose_pack(p, context));
}

type PackFiles = { pack: Pack; files: string[] };

function process_pack(pack: Pack, context: Context): PackFiles {
  core.startGroup(pack.folder);

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

  core.endGroup();
  return out;
}

function process_file(file: string, pack: Pack, context: Context): void {
  try {
    const doc = context.getDocument(file);
    if (doc) {
      core.info("Processing file: " + name(doc.uri, context));
      pack.process(doc);
    }
  } catch (err) {
    core.error(err);
  }
}

function diagnose_pack(data: PackFiles, context: Context): void {
  core.summary.addHeading("Pack: " + data.pack.folder.replace(context.base, ""), 2);
  core.startGroup("diagnose: " + name(data.pack.folder, context));

  data.files.forEach((filepath) => diagnose_file(filepath, context));

  core.endGroup();
  core.summary.addEOL();
}

function diagnose_file(filepath: string, context: Context): void {
  try {
    context.diagnoser.process(filepath);
  } catch (err) {
    core.error(err);
  }
}

function name(path: string, context: Context) {
  return path.replace(context.base, "");
}
