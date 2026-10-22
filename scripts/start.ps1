param(
  [switch]$SkipTunnel
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root 'runtime'
$logs = Join-Path $runtime 'logs'
$bin = Join-Path $runtime 'bin'
$nodeDir = 'D:\codexAI\.toolchains\emsdk\node\24.19.0_64bit'
$node = Join-Path $nodeDir 'node.exe'
$npm = Join-Path $nodeDir 'npm.cmd'
$gh = 'D:\codexAI\.runtime\github-cli\gh.exe'
$repo = 'yjj0339/pinecone-club'
$port = 4460
$env:GH_CONFIG_DIR = 'D:\codexAI\.runtime\github-config'
$env:PATH = "$nodeDir;$env:PATH"
$env:TEMP = Join-Path $runtime 'temp'
$env:TMP = $env:TEMP
$env:npm_config_cache = 'D:\codexAI\.runtime\npm-cache'
New-Item -ItemType Directory -Force -Path $logs, $bin, $env:TEMP | Out-Null

Write-Host '[1/6] 收掉旧实例'
& (Join-Path $PSScriptRoot 'stop.ps1') -Quiet

Write-Host '[2/6] 构建前端'
Push-Location $root
try {
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw '前端构建失败，看上面的报错。' }
} finally {
  Pop-Location
}

Write-Host '[3/6] 启动权威服务端'
$serverOut = Join-Path $logs 'server.out.log'
$serverErr = Join-Path $logs 'server.err.log'
$server = Start-Process -FilePath $node -ArgumentList 'server/index.js' -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr
$healthy = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 2
    if ($health.ok) { $healthy = $true; break }
  } catch {}
}
if (-not $healthy) {
  Get-Content $serverErr -Tail 30 -ErrorAction SilentlyContinue
  throw "服务端没有起来（端口 $port），看 runtime\logs\server.err.log。"
}
Write-Host ("      服务端 OK：{0} 款游戏，端口 {1}" -f $health.games, $port)

$publicUrl = ''
if (-not $SkipTunnel) {
  Write-Host '[4/6] 启动 Cloudflare 隧道'
  $cloudflared = Join-Path $bin 'cloudflared.exe'
  if (-not (Test-Path $cloudflared)) {
    Write-Host '      首次运行，下载 cloudflared...'
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflared -UseBasicParsing
  }
  $tunnelOut = Join-Path $logs 'tunnel.out.log'
  $tunnelErr = Join-Path $logs 'tunnel.err.log'
  $tunnel = Start-Process -FilePath $cloudflared -ArgumentList 'tunnel', '--url', "http://127.0.0.1:$port", '--no-autoupdate' -PassThru -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr
  for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Milliseconds 500
    $text = ''
    if (Test-Path $tunnelErr) { $text += (Get-Content $tunnelErr -Raw -ErrorAction SilentlyContinue) }
    if (Test-Path $tunnelOut) { $text += (Get-Content $tunnelOut -Raw -ErrorAction SilentlyContinue) }
    $match = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) { $publicUrl = $match.Value; break }
  }
  if (-not $publicUrl) { throw '隧道没有拿到公网地址，看 runtime\logs\tunnel.err.log。' }
  Write-Host "      公网地址：$publicUrl"
} else {
  $publicUrl = "http://127.0.0.1:$port"
}

Write-Host '[5/6] 写给前端发现用的地址'
$serverUrlFile = Join-Path $root 'server-url.json'
@{ server = $publicUrl; updatedAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -Path $serverUrlFile -Encoding utf8
$distServerUrl = Join-Path $root 'dist\server-url.json'
if (Test-Path (Split-Path $distServerUrl)) {
  Copy-Item $serverUrlFile $distServerUrl -Force
}
try {
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content $serverUrlFile -Raw)))
  $sha = $null
  try { $sha = & $gh api "repos/$repo/contents/server-url.json?ref=gh-pages" --jq '.sha' 2>$null } catch {}
  $payload = @{ message = 'update server url'; content = $b64; branch = 'gh-pages' }
  if ($sha) { $payload.sha = "$sha".Trim() }
  $json = $payload | ConvertTo-Json -Compress
  $json | & $gh api -X PUT "repos/$repo/contents/server-url.json" --input - | Out-Null
  Write-Host '      线上页面已同步服务器地址'
} catch {
  Write-Host '      线上地址同步跳过（仓库或 gh-pages 还没发布过，先跑一次 publish.ps1）。'
}

Write-Host '[6/6] 记录运行状态'
$state = @{
  serverPid = $server.Id
  tunnelPid = if ($tunnel) { $tunnel.Id } else { 0 }
  port = $port
  publicUrl = $publicUrl
  localUrl = "http://127.0.0.1:$port"
  startedAt = (Get-Date).ToString('o')
} | ConvertTo-Json
Set-Content -Path (Join-Path $runtime 'state.json') -Value $state -Encoding utf8
Start-Sleep -Milliseconds 400

Write-Host ''
Write-Host '============================================'
Write-Host ' PINECONE CLUB 已启动'
Write-Host " 本机：http://127.0.0.1:$port"
Write-Host " 公网：$publicUrl"
if ($publicUrl -like 'https://*') {
  Write-Host " 邀请朋友：$publicUrl（同一时间最多两人）"
}
Write-Host ' 停止：双击「停止松果游戏社.cmd」'
Write-Host ' 说明：关掉这个窗口服务还会继续跑，直到停止脚本执行。'
Write-Host '============================================'