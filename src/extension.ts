// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import os = require('os');
import { FullCode } from './fullcode';
import { Options } from './options';

const config = {
  apiKey: 'AIzaSyAUnA-O2lHkwqoOy3tAkQnBcRgUgDpvUH0',
  authDomain: 'nighthawk-1.firebaseapp.com',
  databaseURL: 'https://nighthawk-1.firebaseio.com',
  storageBucket: 'nighthawk-1.appspot.com'
};
// fb.initializeApp(config);
// threads.config.set({basepath: { node: `${__dirname}/workers/` }});

var fullcode: FullCode;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const options = new Options();
	fullcode = new FullCode(context.extensionPath, options);
	fullcode.initialize();


	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('vscode-fullcode.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed

	// 	// Display a message box to the user	
	// 	vscode.window.showInformationMessage('Hello World from vscode-fullcode!');
	// });
	// context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
  // fullcode.dispose();
}
