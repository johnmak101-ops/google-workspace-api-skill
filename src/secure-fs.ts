import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { WorkspaceError } from './errors.js';

const execFileAsync = promisify(execFile);
const verifiedDirectories = new Set<string>();

async function protectWindows(target: string, directory: boolean): Promise<void> {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const whoamiExe = path.join(systemRoot, 'System32', 'whoami.exe');
  const icaclsExe = path.join(systemRoot, 'System32', 'icacls.exe');
  const powershellExe = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const { stdout: whoami } = await execFileAsync(whoamiExe, [], { windowsHide: true });
  const principal = whoami.trim();
  if (!principal) throw new WorkspaceError('SECURE_STORAGE', 'Cannot determine the Windows account for token protection.');
  const { stdout: userCsv } = await execFileAsync(whoamiExe, ['/user', '/fo', 'csv'], { windowsHide: true, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  const sid = userCsv.match(/S-\d+(?:-\d+)+/i)?.[0];
  if (!sid) throw new WorkspaceError('SECURE_STORAGE', 'Cannot determine the Windows SID for token protection.');
  const ownerOnly = async (): Promise<boolean> => {
    const literalPath = target.replace(/'/g, "''");
    const command = `(Get-Acl -LiteralPath '${literalPath}').Access | ForEach-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value }`;
    const { stdout } = await execFileAsync(powershellExe, ['-NoProfile', '-Command', command], { windowsHide: true });
    const entries = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return entries.length > 0 && entries.every((entry) => entry.toUpperCase() === sid.toUpperCase());
  };
  if (await ownerOnly()) return;
  const grant = directory ? `${principal}:(OI)(CI)F` : `${principal}:F`;
  await execFileAsync(icaclsExe, [target, '/reset'], { windowsHide: true });
  await execFileAsync(icaclsExe, [target, '/inheritance:r', '/grant:r', grant], { windowsHide: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await ownerOnly()) return;
    await delay(20);
  }
  throw new WorkspaceError('SECURE_STORAGE', `Windows token storage ACL is not restricted to the current account: ${target}`);
}

export async function secureDirectory(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    if (verifiedDirectories.has(directory)) return;
    await protectWindows(directory, true);
    verifiedDirectories.add(directory);
  } else {
    await fs.chmod(directory, 0o700);
  }
}

export async function secureFile(file: string): Promise<void> {
  if (process.platform === 'win32') {
    if (verifiedDirectories.has(path.dirname(file))) return;
    await protectWindows(file, false);
  } else {
    await fs.chmod(file, 0o600);
  }
}

export async function atomicWriteSecure(file: string, contents: string): Promise<void> {
  await secureDirectory(path.dirname(file));
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  try {
    await secureFile(temporary);
    await fs.rename(temporary, file);
    await secureFile(file);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}
