/** Optional peer packages from https://github.com/Anu-Code07/figma-to-code */
declare module '@design2code/compiler-core' {
  export function createCompiler(): {
    compile(
      document: unknown,
      options: Record<string, unknown>,
    ): Promise<{
      generation: {
        files: Array<{ path: string; content: string; language: string; kind: string }>;
        warnings: string[];
      };
      merge?: {
        created: string[];
        updated: string[];
        skipped: string[];
        diffs?: Array<{ path: string; action: string; hunks: Array<{ lines: string[] }> }>;
      };
    }>;
  };
  export function registerGenerator(name: string, generator: unknown): void;
  export function parseDesignMd(path: string): Promise<unknown>;
}

declare module '@design2code/figma-parser' {
  export function createFigmaClient(token: string): {
    getFile(fileKey: string, nodeIds?: string[]): Promise<unknown>;
  };
  export function parseFigmaFile(
    figmaFile: unknown,
    opts: { fileKey: string; nodeIds?: string[] },
  ): unknown;
}

declare module '@design2code/merge-engine' {
  export function detectProject(projectRoot: string): Promise<unknown>;
}

declare module '@design2code/generator-flutter' {
  export class FlutterGenerator {}
}
declare module '@design2code/generator-react' {
  export class ReactGenerator {}
}
declare module '@design2code/generator-nextjs' {
  export class NextjsGenerator {}
}
declare module '@design2code/generator-react-native' {
  export class ReactNativeGenerator {}
}
