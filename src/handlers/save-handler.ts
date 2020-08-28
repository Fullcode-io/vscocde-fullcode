import * as vscode from 'vscode';
import * as path from 'path';
import { Options } from '../options';
import { TextDocument } from 'vscode';
import ignore from 'ignore'
import fetch from 'node-fetch'
const debounce = require('lodash.debounce');
const getRepoInfo = require('git-repo-info');
const remoteOrigin = require('remote-origin-url');
const fs = require('fs-extra');
const pako = require('pako');

export class SaveHandler {
  private options: Options;
  private extensionPath: string;
  private clientInfo: object | any;
  private eventsToSave: Array<object>;
  user: object | any;

  constructor(clientInfo: object, user: object) {
    this.clientInfo = clientInfo
    this.user = user
    this.eventsToSave = []
    this.setupEventHandlers()
  }

  public updateClientInfo(clientInfo: object): void {
    this.clientInfo = clientInfo;
  }

  private setupEventHandlers(): void {
    let subscriptions: vscode.Disposable[] = [];
    let resp = vscode.workspace.onDidSaveTextDocument(this.handleDidSave, this, subscriptions)
  }

  private async handleDidSave(document: TextDocument): Promise<void> {
    const nearestSecond = Date.now()
    const filePath = document.fileName
    const relativePath = vscode.workspace.asRelativePath(filePath)
    const text = document.getText()
    console.log('save detected: ', relativePath)

    const pendingSaveEvent = this.eventsToSave[filePath]

    if (pendingSaveEvent) {
      clearTimeout(pendingSaveEvent.timeout)
      pendingSaveEvent.endedAt = nearestSecond
      pendingSaveEvent.content = text
      pendingSaveEvent.timeout = setTimeout(this.sendSaveEvent.bind(this), 3000, pendingSaveEvent)
      return
    }
    const trackedProject = await this.getTrackedProject(filePath)
    if (trackedProject) {
      const saveEvent = {
        clientInfo: this.clientInfo,
        startedAt: nearestSecond,
        endedAt: nearestSecond,
        content: text,
        filePath,
        relativePath,
        project: trackedProject,
        timeout: {}
      }
      saveEvent.timeout = setTimeout(this.sendSaveEvent.bind(this), 3000, saveEvent)
      this.eventsToSave[filePath] = saveEvent
    }
  }

  private async sendSaveEvent(saveEvent: object | any): Promise<void> {
    const token = this.user.getIdToken().catch(e => console.warn(e)) // ensure token is fresh
    delete saveEvent.timeout
    console.log(`sending content for ${saveEvent.relativePath}.`, saveEvent)
    fetch(`http://localhost:5001/nighthawk-1/us-central1/auth/save-event`,
    { method: 'POST',
      headers:
      {
        'Authorization': `Bearer ${await token}`,
        'Content-Type': 'text/plain',
      },
      body: pako.gzip(JSON.stringify(saveEvent), { to: 'string' }),
      // timeout: 0
    })
    .then(async resp => console.log(await resp.json()))
    .catch(err => console.error({err}))
  
    delete this.eventsToSave[saveEvent.filePath]
  }

  private async getTrackedProject(filePath: string): Promise<object | any> {
    const clientInfo = this.clientInfo
    const pathSep = clientInfo.systemInfo.pathSep
    const trackedProjects = clientInfo.authData.trackedProjects
    const eventObject = {}
    let shouldIgnore = false
    const repoInfo = await this.getGitInfo(filePath)
    const relativePath = vscode.workspace.asRelativePath(filePath)
    console.log('repoInfo: ', repoInfo)
    const foundProject: any = Object.values(trackedProjects || {}).find((project: object | any) => project.name === repoInfo.repoName)
    const projectBranches = foundProject?.branches
    const foundBranch: any = Object.values(projectBranches || {}).find((branch: object | any) => branch.name === repoInfo.branch.toLowerCase())
    if (!foundBranch) {
      return
    }
    
    if (repoInfo.gitIgnore) {
      //TODO: need to add .fullcodeignore
      shouldIgnore = ignore().add(repoInfo.gitIgnore).ignores(relativePath)
    }

    if (!shouldIgnore) {
      // const publicProjects = clientInfo.authData.projectIndexes.public
      const privateProjects = clientInfo.authData.projectIndexes.private || {}
      const isPrivate = !!privateProjects[foundProject.id]
      // TODO: remove this hard coded return
      return {
        id: foundProject.id,
        name: foundProject.name,
        branchID: foundBranch.id,
        branchName: foundBranch.name,
        repoInfo,
        isPrivate
      }
      // return {
      //   branchID:"-LJS0b8NWExlBTd2waHi",
      //   branchName:"master",
      //   id:"-LJS-fppjNjPVmW1x1-7",
      //   isPrivate:true,
      //   name:"nighthawk",
      //   repoInfo
      // }
    }
    return
  }

  private async getGitInfo(filePath: string): Promise<object | any> {
    const repoInfo = getRepoInfo(filePath)
    const gitRoot = repoInfo.root
    if (!gitRoot) {
      return {}
    }
    const hasGitignore = fs.pathExists(`${gitRoot}/.gitignore`)
    const pathSep = this.clientInfo.systemInfo?.pathSep
    repoInfo.remoteOrigin = remoteOrigin.sync(`${gitRoot}/.git/config`)
    const uri = repoInfo.remoteOrigin || repoInfo.root
    // There's no offical "repo name" in git so best guess is from remote origin. If no remote origin yet then use cwd.
    repoInfo.repoName = path.basename(uri, '.git').toLowerCase()
    if (await hasGitignore) {
      repoInfo.gitIgnore = await fs.readFile(`${gitRoot}/.gitignore`, {encoding: 'utf8'})
    }
    return repoInfo
  }
}
