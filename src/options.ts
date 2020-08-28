import * as path from 'path';
import * as fs from 'fs';

import { Dependencies } from './dependencies';
import { ExpirationStrategy } from './cache/expiration-strategy';
import { MemoryStorage } from './cache/memory-storage';

export class Options {
  private configFile: string;
  private logFile: string;
  private readonly cache: ExpirationStrategy;

  constructor() {
    this.cache = new ExpirationStrategy(new MemoryStorage());
    let fullcodeHome = this.getFullcodeHome();
    this.configFile = path.join(fullcodeHome, '.fullcode.cfg');
    this.logFile = path.join(fullcodeHome, '.fullcode.log');
  }

  private getFullcodeHome(): string {
    let home = process.env.FULLCODE_HOME;
    if (home) {
      return home;
    } else {
      return this.getUserHomeDir();
    }
  }

  public async getSettingAsync<T = any>(section: string, key: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.getSetting(section, key, (err, result) => {
        err ? reject(err) : resolve(result);
      });
    });
  }

  public getSetting(section: string, key: string, callback: (string, any) => void): void {
    fs.readFile(
      this.getConfigFile(),
      'utf-8',
      (err: NodeJS.ErrnoException | null, content: string) => {
        if (err) {
          if (callback) callback(new Error(`could not read ${this.getConfigFile()}`), null);
        } else {
          let currentSection = '';
          let lines = content.split('\n');
          for (var i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (this.startsWith(line.trim(), '[') && this.endsWith(line.trim(), ']')) {
              currentSection = line
                .trim()
                .substring(1, line.trim().length - 1)
                .toLowerCase();
            } else if (currentSection === section) {
              let parts = line.split('=');
              let currentKey = parts[0].trim();
              if (currentKey === key && parts.length > 1) {
                callback(null, parts[1].trim());
                return;
              }
            }
          }

          if (callback) callback(null, null);
        }
      },
    );
  }

  public setSetting(section: string, key: string, val: string): void {
    fs.readFile(
      this.getConfigFile(),
      'utf-8',
      (err: NodeJS.ErrnoException | null, content: string) => {
        // ignore errors because config file might not exist yet
        if (err) content = '';

        let contents: string[] = [];
        let currentSection = '';

        let found = false;
        let lines = content.split('\n');
        for (var i = 0; i < lines.length; i++) {
          let line = lines[i];
          if (this.startsWith(line.trim(), '[') && this.endsWith(line.trim(), ']')) {
            if (currentSection === section && !found) {
              contents.push(key + ' = ' + val);
              found = true;
            }
            currentSection = line
              .trim()
              .substring(1, line.trim().length - 1)
              .toLowerCase();
            contents.push(line);
          } else if (currentSection === section) {
            let parts = line.split('=');
            let currentKey = parts[0].trim();
            if (currentKey === key) {
              if (!found) {
                contents.push(key + ' = ' + val);
                found = true;
              }
            } else {
              contents.push(line);
            }
          } else {
            contents.push(line);
          }
        }

        if (!found) {
          if (currentSection !== section) {
            contents.push('[' + section + ']');
          }
          contents.push(key + ' = ' + val);
        }

        fs.writeFile(this.getConfigFile(), contents.join('\n'), err => {
          if (err) throw err;
        });
      },
    );
  }

  public getConfigFile(): string {
    return this.configFile;
  }

  public getLogFile(): string {
    return this.logFile;
  }

  public async getAuthTokenAsync(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const cachedApiKey = await this.cache.getItem<string>('auth_token');
      if (cachedApiKey) return resolve(cachedApiKey);

      await this.getSettingAsync<string>('settings', 'auth_token')
        .then(apiKey => {
          this.cache.setItem('auth_token', apiKey, { ttl: 300 });
          resolve(apiKey);
        })
        .catch(err => reject(err));
    });
  }

  public getUserHomeDir(): string {
    if (this.isPortable()) return process.env['VSCODE_PORTABLE'] as string;

    return process.env[Dependencies.isWindows() ? 'USERPROFILE' : 'HOME'] || '';
  }

  public isPortable(): boolean {
    return !!process.env['VSCODE_PORTABLE'];
  }

  public startsWith(outer: string, inner: string): boolean {
    return outer.slice(0, inner.length) === inner;
  }

  public endsWith(outer: string, inner: string): boolean {
    return inner === '' || outer.slice(-inner.length) === inner;
  }
}