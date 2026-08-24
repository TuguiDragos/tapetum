import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = {
  darwin: [
    '/Applications/Visual Studio Code.app/Contents/Resources/app',
    '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app',
    '/Applications/VSCodium.app/Contents/Resources/app',
    path.join(os.homedir(), 'Applications/Visual Studio Code.app/Contents/Resources/app'),
  ],
  win32: [
    path.join(process.env.LOCALAPPDATA || '', 'Programs/Microsoft VS Code/resources/app'),
    path.join(process.env.ProgramFiles || '', 'Microsoft VS Code/resources/app'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft VS Code/resources/app'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs/VSCodium/resources/app'),
  ],
  linux: [
    '/usr/share/code/resources/app',
    '/opt/visual-studio-code/resources/app',
    '/snap/code/current/usr/share/code/resources/app',
    '/usr/share/codium/resources/app',
    '/var/lib/flatpak/app/com.visualstudio.code/current/active/files/extra/vscode/resources/app',
    path.join(os.homedir(), '.local/share/flatpak/app/com.visualstudio.code/current/active/files/extra/vscode/resources/app'),
  ],
};

export function appRoot() {
  if (process.env.VSCODE_APP) return process.env.VSCODE_APP;
  for (const c of CANDIDATES[process.platform] || []) {
    if (c && fs.existsSync(path.join(c, 'product.json'))) return c;
  }
  throw new Error(
    `nu am gasit instalarea VS Code pe ${process.platform}. Seteaza VSCODE_APP catre folderul resources/app`,
  );
}

export const bundledExtensions = () => path.join(appRoot(), 'extensions');
export const workbenchCss = () => path.join(appRoot(), 'out/vs/workbench/workbench.desktop.main.css');
export const workbenchJs = () => path.join(appRoot(), 'out/vs/workbench/workbench.desktop.main.js');

const userExtensionRoots = () => {
  const roots = [];
  if (process.env.VSCODE_USER_EXTENSIONS) roots.push(process.env.VSCODE_USER_EXTENSIONS);
  roots.push(path.join(os.homedir(), '.vscode', 'extensions'));
  roots.push(path.join(os.homedir(), '.vscode-insiders', 'extensions'));
  roots.push(path.join(os.homedir(), '.vscode-oss', 'extensions'));
  return roots.filter((r) => fs.existsSync(r));
};

export function extensionRoots() {
  const roots = [];
  try { roots.push(bundledExtensions()); } catch { /* fara instalare locala */ }
  return [...roots, ...userExtensionRoots()];
}
