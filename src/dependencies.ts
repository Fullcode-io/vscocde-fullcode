import * as os from 'os';

import { Options } from './options';

export class Dependencies {
  private options: Options;
  private extensionPath: string;

  constructor(options: Options, extensionPath: string, standalone: boolean) {
    this.options = options;
    this.extensionPath = extensionPath;
  }

  public static isWindows(): boolean {
    return os.platform() === 'win32';
  }
}