param(
  [switch]$Quiet
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root 'runtime'
$statePath = Join-Path $runtime 'state.json'
$port = 4460
$killed = @()

function Get-ProcessInfo($processId) {
  Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
}

function Stop-OurProcess($processId, $pattern) {
  if (-not $processId -or $processId -le 0) { return }
  $info = Get-ProcessInfo $processId
  if (-not $info) { return }
  if ($pattern -and ($info.CommandLine -notlike $pattern)) { return }
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  $script:killed += $processId
}

if (Test-Path $statePath) {
  try {
    $state = Get-Content $statePath -Raw | ConvertFrom-Json
    if ($state.tunnelPid) {
      $info = Get-ProcessInfo $state.tunnelPid
      if ($info -and $info.Name -eq 'cloudflared.exe') { Stop-OurProcess $state.tunnelPid '*cloudflared*' }
    }
    if ($state.serverPid) {
      $info = Get-ProcessInfo $state.serverPid
      if ($info -and $info.Name -eq 'node.exe') { Stop-OurProcess $state.serverPid '*pinecone-club*' }
    }
    Remove-Item $statePath -Force
  } catch {}
}

$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $info = Get-ProcessInfo $listener.OwningProcess
  if ($info -and $info.CommandLine -like '*pinecone-club*') {
    Stop-OurProcess $listener.OwningProcess '*pinecone-club*'
  }
}

$tunnels = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue
foreach ($tunnel in $tunnels) {
  if ($tunnel.CommandLine -like "*127.0.0.1:$port*") {
    Stop-OurProcess $tunnel.ProcessId '*cloudflared*'
  }
}

if (-not $Quiet) {
  if ($killed.Count -gt 0) {
    Write-Host "已停止 PINECONE CLUB（进程：$($killed -join ', ')）"
  } else {
    Write-Host '没有找到正在运行的 PINECONE CLUB 实例。'
  }
  Start-Sleep -Milliseconds 600
  $still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($still) { Write-Host "注意：端口 $port 仍被别的程序占用（不是本项目，未处理）。" } else { Write-Host "端口 $port 已释放。" }
}