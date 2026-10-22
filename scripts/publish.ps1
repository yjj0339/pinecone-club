$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root 'runtime'
$nodeDir = 'D:\codexAI\.toolchains\emsdk\node\24.19.0_64bit'
$npm = Join-Path $nodeDir 'npm.cmd'
$gh = 'D:\codexAI\.runtime\github-cli\gh.exe'
$repo = 'yjj0339/pinecone-club'
$owner = 'yjj0339'
$siteUrl = "https://$owner.github.io/pinecone-club/"
$env:GH_CONFIG_DIR = 'D:\codexAI\.runtime\github-config'
$env:PATH = "$nodeDir;$env:PATH"
$env:TEMP = Join-Path $runtime 'temp'
$env:TMP = $env:TEMP
$env:npm_config_cache = 'D:\codexAI\.runtime\npm-cache'
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

Write-Host '[1/5] 构建前端'
Push-Location $root
try {
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw '构建失败。' }
} finally {
  Pop-Location
}

Write-Host '[2/5] 准备发布目录'
$pages = Join-Path $runtime 'pages'
if (Test-Path $pages) { Remove-Item $pages -Recurse -Force }
New-Item -ItemType Directory -Force -Path $pages | Out-Null
Copy-Item -Path (Join-Path $root 'dist\*') -Destination $pages -Recurse -Force
$urlFile = Join-Path $pages 'server-url.json'
$keep = $false
$localUrlFile = Join-Path $root 'server-url.json'
if (Test-Path $localUrlFile) {
  try {
    $local = Get-Content $localUrlFile -Raw | ConvertFrom-Json
    if ($local.server) {
      Copy-Item $localUrlFile $urlFile -Force
      $keep = $true
    }
  } catch {}
}
if (-not $keep) {
  try {
    $remote = Invoke-RestMethod -Uri ($siteUrl + 'server-url.json') -TimeoutSec 10
    if ($remote.server) {
      @{ server = $remote.server; updatedAt = $remote.updatedAt } | ConvertTo-Json | Set-Content -Path $urlFile -Encoding utf8
      $keep = $true
    }
  } catch {}
}
if (-not $keep) {
  @{ server = ''; updatedAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -Path $urlFile -Encoding utf8
}

Write-Host '[3/5] 推送主分支'
try { & $gh auth setup-git; } catch {}
Push-Location $root
try {
  if (-not (Test-Path (Join-Path $root '.git'))) {
    git init -b main | Out-Null
  }
  git config user.name 'PINECONE CLUB'
  git config user.email 'yjj0339@users.noreply.github.com'
  git add -A
  git commit -m 'PINECONE CLUB: 双人联机小游戏合集' | Out-Null
  $remoteExists = $false
  try { & $gh api "repos/$repo" --jq '.name' | Out-Null; $remoteExists = $true } catch {}
  if (-not $remoteExists) {
    & $gh repo create $repo --public --description 'PINECONE CLUB 松果游戏社：20 款双人联机小游戏'
  }
  $origin = git remote 2>$null
  if ($origin -notcontains 'origin') {
    git remote add origin "https://github.com/$repo.git"
  }
  $gitArgs = @('-c', 'http.proxy=', '-c', 'https.proxy=', '-c', 'http.version=HTTP/1.1')
  $pushed = $false
  for ($attempt = 0; $attempt -lt 6; $attempt++) {
    & git @gitArgs push -u origin main
    if ($LASTEXITCODE -eq 0) { $pushed = $true; break }
    Write-Host "      推送失败，第 $($attempt + 1) 次重试..."
    Start-Sleep -Seconds 4
  }
  if (-not $pushed) { throw '推送主分支失败。' }
} finally {
  Pop-Location
}

Write-Host '[4/5] 发布 gh-pages'
Push-Location $pages
try {
  git init -b gh-pages | Out-Null
  git config user.name 'PINECONE CLUB'
  git config user.email 'yjj0339@users.noreply.github.com'
  git add -A
  git commit -m 'publish PINECONE CLUB' | Out-Null
  git remote add origin "https://github.com/$repo.git" 2>$null
  $gitArgs = @('-c', 'http.proxy=', '-c', 'https.proxy=', '-c', 'http.version=HTTP/1.1')
  $pushed = $false
  for ($attempt = 0; $attempt -lt 6; $attempt++) {
    & git @gitArgs push -f origin gh-pages
    if ($LASTEXITCODE -eq 0) { $pushed = $true; break }
    Write-Host "      发布失败，第 $($attempt + 1) 次重试..."
    Start-Sleep -Seconds 4
  }
  if (-not $pushed) { throw '推送 gh-pages 失败。' }
} finally {
  Pop-Location
}

Write-Host '[5/5] 打开 GitHub Pages'
$pagesBody = '{"source":{"branch":"gh-pages","path":"/"}}'
try {
  $pagesBody | & $gh api -X POST "repos/$repo/pages" --input - | Out-Null
  Write-Host '      已开启 Pages'
} catch {
  try {
    $pagesBody | & $gh api -X PUT "repos/$repo/pages" --input - | Out-Null
    Write-Host '      已更新 Pages 配置'
  } catch {
    Write-Host '      Pages 配置没改成功，可能已开启或需要网页确认。'
  }
}

Write-Host ''
Write-Host '============================================'
Write-Host " 线上地址：$siteUrl"
Write-Host ' 若刚首次发布，页面可能要等 1-10 分钟才生效。'
Write-Host ' 之后启动服务时跑 start.ps1 会把公网隧道地址同步到线上。'
Write-Host '============================================'