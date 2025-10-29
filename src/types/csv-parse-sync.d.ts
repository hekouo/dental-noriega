declare module "csv-parse/sync" {
  export interface Options {
    columns?: boolean | string[];
    delimiter?: string;
    [k: string]: any;
  }
  export function parse(input: string | Buffer, options?: Options): any[];
}
