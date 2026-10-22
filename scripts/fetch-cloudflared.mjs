import { createWriteStream, existsSync, statSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const gh = 'D:\\codexAI\\.runtime\\github-cli\\gh.exe';
const target = process.argv[2] || 'runtime/bin/cloudflared.exe';
const temp = `${target}.part`;

function token() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  const env = { ...process.env, GH_CONFIG_DIR: 'D:\\codexAI\\.runtime\\github-config' };
  return execFileSync(gh, ['auth', 'token'], { env, encoding: 'utf8' }).trim();
}

async function main() {
  const auth = { Authorization: `Bearer ${token()}`, 'User-Agent': 'pinecone-club' };
  const release = await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest', { headers: auth }).then((response) => {
    if (!response.ok) throw new Error(`无法查询 cloudflared 版本：HTTP ${response.status}`);
    return response.json();
  });
  const asset = release.assets.find((item) => item.name === 'cloudflared-windows-amd64.exe');
  if (!asset) throw new Error('最新版没有 Windows 可执行文件。');
  console.log(`cloudflared ${release.tag_name}，${(asset.size / 1024 / 1024).toFixed(1)} MB`);
  const response = await fetch(`https://api.github.com/repos/cloudflare/cloudflared/releases/assets/${asset.id}`, {
    headers: { ...auth, Accept: 'application/octet-stream' },
  });
  if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temp));
  if (!existsSync(temp) || statSync(temp).size < asset.size * 0.95) {
    throw new Error(`下载不完整：${existsSync(temp) ? statSync(temp).size : 0} / ${asset.size}`);
  }
  renameSync(temp, target);
  console.log(`已保存：${target}（${statSync(target).size} 字节）`);
}

main().catch((error) => {
  console.error(`cloudflared 下载失败：${error.message}`);
  process.exit(1);
});