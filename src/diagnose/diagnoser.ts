import * as core from "@actions/core";
import { Diagnoser, DiagnosticsBuilderContent, DiagnosticSeverity, ManagedDiagnosticsBuilder } from "bc-minecraft-bedrock-diagnoser";
import { ProjectData } from "bc-minecraft-bedrock-project";
import { Types } from 'bc-minecraft-bedrock-types';
import { MCIgnore, MCProject } from "bc-minecraft-project";
import { readFileSync } from "fs";
import { Range, TextDocument } from "vscode-languageserver-textdocument";
import { Character } from "../code/character";
import { Glob } from "./glob";

export function CreateDiagnoser(folder: string): Context {
  return new Context(folder);
}

export class Context implements DiagnosticsBuilderContent<TextDocument> {
  public project: MCProject;
  public data: ProjectData;
  public diagnoser: Diagnoser;
  public base: string;

  constructor(folder: string) {
    this.project = MCProject.loadSync(folder);
    this.data = new ProjectData(this);
    this.diagnoser = new Diagnoser(this);
    this.base = folder;
  }

  /** @inheritdoc */
  getDiagnoser(doc: TextDocument, project: MCProject): ManagedDiagnosticsBuilder<TextDocument> {
    //is excluded
    if (Glob.IsMatch(doc.uri, project.ignores.patterns)) return undefined;

    return new _InternalDiagnoser(this, project, doc);
  }

  getDocument(uri: string): TextDocument {
    //is excluded
    if (Glob.IsMatch(uri, this.project.ignores.patterns)) return undefined;

    const buffer = readFileSync(uri);

    return TextDocument.create(uri, "unknown", 0, buffer.toString());
  }

  getFiles(folder: string, pattern: string[], ignores: MCIgnore): string[] {
    return Glob.GetFiles(pattern, ignores.patterns, folder);
  }

  /**The project cache data*/
  getCache(): ProjectData {
    return this.data;
  }
}

export interface msgError {
  message: string;
  anno: core.AnnotationProperties;
  severity: DiagnosticSeverity;
}

class _InternalDiagnoser implements ManagedDiagnosticsBuilder<TextDocument> {
  public context: DiagnosticsBuilderContent<TextDocument>;
  public project: MCProject;
  public doc: TextDocument;
  public path: string;
  public items: msgError[];

  /** @inheritdoc */
  constructor(context: Context, project: MCProject, doc: TextDocument) {
    this.context = context;
    this.project = project;
    this.doc = doc;
    this.path = this.doc.uri.replace(context.base, "");
    this.items = [];
  }

  /** @inheritdoc */
  done(): void {
    if (this.items.length <= 0) return;

    core.startGroup("errors: " + this.path);
    core.setFailed("found errors for doc: " + this.path);

    for (let I = 0; I < this.items.length; I++) {
      const error = this.items[I];

      switch (error.severity) {
        case DiagnosticSeverity.error:
          core.summary.addRaw(`:exclamation: ${this.path}\n\t${error.message}`);
          core.error(error.message, error.anno);
          break;

        case DiagnosticSeverity.warning:
          core.summary.addRaw(`:warning: ${this.path}\n\t${error.message}`);
          core.warning(error.message, error.anno);
          break;

        default:
        case DiagnosticSeverity.none:
        case DiagnosticSeverity.info:
          core.summary.addRaw(`:bulb: ${this.path}\n\t${error.message}`);
          core.info(error.message);
          break;
      }
    }

    core.endGroup();
    //Nothing to mark done
  }

  /** @inheritdoc */
  add(position: Types.DocumentLocation, message: string, severity: DiagnosticSeverity, code: string | number): void {
    if (this.project.attributes["diagnostic.disable." + code] === "false") return;

    const r = GetRange(position, this.doc);

    const anno : core.AnnotationProperties = {
      title: typeof code === "number" ? code.toString() : code,
      startLine: r.start.line,
      startColumn: r.start.character,
      endLine: r.end.line,
      endColumn: r.end.character,
      file: this.path,
    };

    message = message.replace(/[\r\n]+/gi, "");

    this.items.push({ anno: anno, message: message, severity: severity });
  }
}

/**
 *
 * @param position
 * @param doc
 * @returns
 */
function GetRange(position: Types.DocumentLocation, doc: TextDocument): Range {
  if (Types.JsonPath.is(position)) {
    return resolveJsonPath(position, doc);
  }

  let Start: Types.Position;
  let End: Types.Position | undefined = undefined;

  //If document location is already a position, then grab the offset to start at
  if (Types.Position.is(position)) {
    Start = position;
    position = doc.offsetAt(position);
    //If document location is already an offset, then grab the start position
  } else if (Types.OffsetWord.is(position)) {
    Start = doc.positionAt(position.offset);
    End = doc.positionAt(position.text.length + position.offset);

    return { start: Start, end: End };
  } else {
    Start = doc.positionAt(position);
  }

  const text = doc.getText();

  for (let I = position + 1; I < text.length; I++) {
    const c = text.charCodeAt(I);

    //If character is a letter or number then keep going until we find something else
    if (Character.IsLetterCode(c) || Character.IsNumberCode(c)) continue;

    //Dashes and underscore are to be respected
    switch (c) {
      case Character.Character_dash:
      case Character.Character_underscore:
      case Character.Character_forwardslash:
      case Character.Character_column:
        continue;
    }

    //Something has been found that is not considered a "word"
    End = doc.positionAt(I);
    break;
  }

  //If end is still undefined then make atleast one character big
  if (!End) {
    End = { character: Start.character + 1, line: Start.line };
  }

  return { start: Start, end: End };
}

function resolveJsonPath(position: string, doc: TextDocument): Range {
  const index = position.lastIndexOf("/");
  const length = index > -1 ? position.length - index : position.length;

  const offset = Types.JsonPath.resolve(doc, position);

  const start = doc.positionAt(offset);
  const end = doc.positionAt(offset + length);

  return { start: start, end: end };
}
