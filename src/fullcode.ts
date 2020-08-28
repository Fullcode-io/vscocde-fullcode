import * as vscode from 'vscode';
import { Options } from './options';
import { Utils } from './utils';
import { SaveHandler } from "./handlers/save-handler";
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';


const fb = require("firebase");
const getRepoInfo = require('git-repo-info');

const firebaseConfig = {
  apiKey: 'AIzaSyAUnA-O2lHkwqoOy3tAkQnBcRgUgDpvUH0',
  authDomain: 'nighthawk-1.firebaseapp.com',
  databaseURL: 'https://nighthawk-1.firebaseio.com',
  storageBucket: 'nighthawk-1.appspot.com',
  projectId: "nighthawk-1",
};

const devFirebaseConfig = {
  apiKey: "AIzaSyAUnA-O2lHkwqoOy3tAkQnBcRgUgDpvUH0",
  // authDomain: "nighthawk-1.firebaseapp.com",
  databaseURL: "http://localhost:9000?&ns=nighthawk-1",
  projectId: "nighthawk-1",
  storageBucket: "nighthawk-1.appspot.com",
  messagingSenderId: "20247827344",
  appId: "1:20247827344:web:857cf7a6d38b23bfbe1915"
};


export class FullCode {
  private user: object | any;
  private extension: any;
  private options: Options;
  private authData: object | {};
  private saveHandler: SaveHandler;
  private clientInfo: object;
  private userAuthDataHandler: object;
  private disposable: vscode.Disposable;
  private statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  );

  constructor(extensionPath: string, options: Options) {
    this.options = options;
    fb.initializeApp(devFirebaseConfig);
  }

  public initialize(): void {
    fb.auth().onIdTokenChanged(async (user: object | undefined) => {
      if (user && !this.user) {
        this.user = user
        console.log('user signed in: ', user)
        this.updateHandlers()
        this.setupEventHandlers()
      } else if (!user) {
        this.checkAuthToken()
        // this.openSignInPage()
      }
      else {
        this.updateHandlers()
      }
    })
  }

  private setupEventHandlers(): void {
    const userAuthDataRef = fb.database().ref(`auth-data/${this.user.uid}`)
    if (!this.userAuthDataHandler) {
      this.userAuthDataHandler = userAuthDataRef.on('value', async (snap) => {
        this.authData = snap.val() || {}
        await this.updateHandlers()
        this.saveHandler = this.saveHandler || new SaveHandler(this.clientInfo, this.user)
      })
    }
  }

  private async updateHandlers(): Promise<void> {
    this.clientInfo = this.getClientInfo()
    this.saveHandler?.updateClientInfo(this.clientInfo)
  }

  private getClientInfo(): object {
    process.versions[process.platform] = os.release()
    const systemInfo = {
      platform: process.platform,
      release: os.release(),
      versions: process.versions,
      dirname: __dirname,
      EOL: os.EOL,
      pathSep: path.sep,
      userInfo: os.userInfo()
    }
    return {
      fbID: this.user.uid,
      apiKey: firebaseConfig.apiKey,
      refreshToken: this.user.refreshToken,
      authData: this.authData,
      systemInfo
    }
  }

  private async checkAuthToken(): Promise<void> {
    const hasAuthToken = await this.hasAuthToken()
    if (!hasAuthToken) {
      console.log('no auth token found')
      this.promptForAuthToken()
    }
  }

  public promptForAuthToken(): void {
    this.options.getSetting('settings', 'auth_token', (_err, defaultVal) => {
      if (Utils.validateKey(defaultVal) != '') defaultVal = '';
      let promptOptions = {
        prompt: 'Fullcode User Auth Token',
        placeHolder: 'Enter your auth token from https://fullcode.io/settings',
        value: defaultVal,
        ignoreFocusOut: true,
        validateInput: Utils.validateKey.bind(this),
      };
      vscode.window.showInputBox(promptOptions).then(val => {
        if (val != undefined) {
          let validation = Utils.validateKey(val);
          if (validation === '') this.options.setSetting('settings', 'auth_token', val);
          else vscode.window.setStatusBarMessage(validation);
        } else vscode.window.setStatusBarMessage('Fullcode User auth token not provided');
      });
    });
  }

  private hasAuthToken(): Object {
    return this.options
      .getAuthTokenAsync()
      .then(authToken => {
        // TODO: consider switching to this method https://stackoverflow.com/a/57119131
        console.log('using stored auth token to sign in: ', authToken)
        const credential = fb.auth.GithubAuthProvider.credential(authToken)
        return fb.auth().signInWithCredential(credential)
      })
      .catch(err => {
        console.error(`Error reading auth token: ${err}`);
        return false
      });
  }
}