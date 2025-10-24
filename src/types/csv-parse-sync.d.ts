declare module "csv-parse/sync" {
  export interface Options {
    delimiter?: string | RegExp;
    columns?: boolean | string[];
    skip_empty_lines?: boolean;
    bom?: boolean;
    relax_column_count?: boolean;
    [k: string]: unknown;
  }
  export function parse<T = any>(
    input: string | Buffer,
    options?: Options,
  ): T[];
}
