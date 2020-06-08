import * as vscode from 'vscode';


export class FullCode {
  private agentName: string;
  private extension: any;
  private extensionPath: string;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
    console.log('constructeddd!');
    
  }

  public initialize(): void {
    this.agentName = 'agent';
    console.log('initailized!');
    
  }
}