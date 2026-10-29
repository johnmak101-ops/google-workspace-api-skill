import { spawn, type ChildProcess } from 'node:child_process';
import { WorkspaceError } from './errors.js';

export interface LaunchResult {
  readonly command: string;
  readonly pid?: number;
}

function quote(value: string): string {
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

function waitForSpawn(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('spawn', () => resolve());
  });
}

export async function launchAuthWindow(argv: readonly string[]): Promise<LaunchResult> {
  const cli = process.argv[1];
  if (!cli) throw new WorkspaceError('LAUNCH_FAILED', 'Cannot locate the CLI entry point to relaunch.');
  const node = process.execPath;
  const command = [node, cli, ...argv].map(quote).join(' ');
  let child: ChildProcess;
  if (process.platform === 'win32') {
    child = spawn('cmd.exe', ['/d', '/c', 'start', '', node, cli, ...argv], { detached: true, stdio: 'ignore', windowsHide: false });
  } else if (process.platform === 'darwin') {
    const script = `tell application "Terminal" to do script ${JSON.stringify(command)}`;
    child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
  } else {
    child = spawn(process.env.TERMINAL || 'x-terminal-emulator', ['-e', node, cli, ...argv], { detached: true, stdio: 'ignore' });
  }
  try {
    await waitForSpawn(child);
  } catch (error) {
    throw new WorkspaceError('LAUNCH_FAILED', `Could not open a terminal window. Run this yourself: ${command}`);
  }
  child.unref();
  return { command, ...(child.pid ? { pid: child.pid } : {}) };
}
