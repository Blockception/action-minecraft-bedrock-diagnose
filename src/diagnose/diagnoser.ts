import { ProjectData } from "bc-minecraft-bedrock-project";
import {
  Diagnoser,
  DiagnoserContext,
  DiagnosticsBuilderContent,
  DiagnosticSeverity,
  InternalDiagnosticsBuilder,
} from "bc-minecraft-bedrock-diagnoser";
import { DocumentLocation } from "bc-minecraft-bedrock-types/lib/src/Types/DocumentLocation";
import { MCIgnore, MCProject } from "bc-minecraft-project";
import { Glob } from "./glob";
import { readFileSync } from "fs";
import { TextDocument, Range } from "vscode-languageserver-textdocument";
import { Types } from "bc-minecraft-bedrock-types";
import * as core from "@actions/core";
import { Character } from '../code/character';

export function CreateDiagnoser(folder: string): Context {
  return new Context(folder);
}

export class Context implements DiagnoserContext {
  public project: MCProject;
  public data: ProjectData;
  public diagnoser: Diagnoser;

  constructor(folder: string) {
    this.project = MCProject.loadSync(folder);
    this.data = new ProjectData(this);
    this.diagnoser = new Diagnoser(this);
  }

  /**
   *
   * @param doc
   * @param project
   * @returns
   */
  getDiagnoser(doc: TextDocument, project: MCProject): InternalDiagnosticsBuilder {
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

  getFiles(folder: string, ignores: MCIgnore): string[] {
    return Glob.GetFiles("*", ignores.patterns, folder);
  }

  getCache(): ProjectData {
    return this.data;
  }
}

class _InternalDiagnoser implements InternalDiagnosticsBuilder {
  public context: DiagnosticsBuilderContent;
  public project: MCProject;
  public doc: TextDocument;
  public errors : boolean;

  /**
   *
   * @param context
   * @param project
   */
  constructor(context: DiagnosticsBuilderContent | DiagnoserContext, project: MCProject, doc: TextDocument) {
    this.context = context;
    this.project = project;
    this.doc = doc;
    this.errors = false;

    core.startGroup(this.doc.uri);
  }

  done(): void {
    if (this.errors) core.setFailed("found errors for doc: " + this.doc.uri);
    core.endGroup();
    //Nothing to mark done
  }

  Add(position: DocumentLocation, message: string, severity: DiagnosticSeverity, code: string | number): void {
    const r = GetRange(position, this.doc);

    const anno = {
      title: typeof code === "number" ? code.toString() : code,
      startLine: r.start.line,
      startColumn: r.start.character,
      endLine: r.end.line,
      endColumn: r.end.character,
    };

    message += "\ndoc: " + this.doc.uri;

    switch (severity) {
      case DiagnosticSeverity.error:
        this.errors = true;
        core.error(message, anno);
        break;
      case DiagnosticSeverity.warning:
        core.warning(message, anno);

      default:
      case DiagnosticSeverity.none:
      case DiagnosticSeverity.info:
        core.info(message);
    }
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
  } else {
    Start = doc.positionAt(position);
  }

  const text = doc.getText();

  for (let I = position + 1; I < text.length; I++) {
    const c = text.charCodeAt(I);

    //If character is a letter or number then keep going until we find something else
    if (Character.IsLetterCode(c) || Character.IsNumberCode(c)) continue;

    //Dashes and underscore are to be respected
    if (c === Character.Character_dash || c === Character.Character_underscore) continue;

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
  const end = doc.positionAt(offset + position.length);

  return { start: start, end: end };
}
