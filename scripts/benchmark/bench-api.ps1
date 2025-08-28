param(
  [string]$BaseUrl = "http://188.166.192.72:8080",
  [int]$Warmup = 0,
  [int]$TimeoutSec = 30,
  [int]$HistoryHours = 24,
  [int]$MaxIds = 5,
  [switch]$WithPoints,
  [switch]$SaveJson,
  [switch]$SaveCsv
)

# Forçar repeat para 1 conforme pedido (não configurável)
$Repeat = 1

# Garantir UTF-8 na consola para evitar "ConcluÃ­do" etc.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-Stopwatch() {
  return [System.Diagnostics.Stopwatch]::StartNew()
}

function Measure-Endpoint {
  param(
    [string]$Name,
    [string]$Url,
    [int]$Repeat = 1,
    [int]$Warmup = 0,
    [int]$TimeoutSec = 30
  )
  $results = @()
  for ($i = 0; $i -lt $Warmup; $i++) {
    $wUrl = Add-CacheBuster $Url
    try { Invoke-WebRequest -Uri $wUrl -Method GET -TimeoutSec $TimeoutSec -Headers @{ 'User-Agent'='bench-api.ps1'; 'Cache-Control'='no-cache'; 'Pragma'='no-cache' } | Out-Null } catch { }
  }
  for ($i = 1; $i -le $Repeat; $i++) {
    $finalUrl = Add-CacheBuster $Url
    $sw = New-Stopwatch
    $ok = $true; $size = 0; $code = $null
    try {
      $resp = Invoke-WebRequest -Uri $finalUrl -Method GET -TimeoutSec $TimeoutSec -Headers @{ 'User-Agent'='bench-api.ps1'; 'Cache-Control'='no-cache'; 'Pragma'='no-cache' }
      $code = $resp.StatusCode
      $size = if ($resp.Content) { [Text.Encoding]::UTF8.GetByteCount($resp.Content) } else { 0 }
    } catch {
      $ok = $false
      $code = if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { [int]$_.Exception.Response.StatusCode } else { -1 }
      $size = 0
    } finally {
      $sw.Stop()
      $results += [PSCustomObject]@{ name=$Name; url=$finalUrl; ok=$ok; code=$code; ms=[int]$sw.Elapsed.TotalMilliseconds; bytes=$size; at=(Get-Date).ToString('s') }
    }
  }
  return $results
}

function Get-Stats {
  param([object[]]$Samples)
  # Normalizar para array para evitar erros de Count quando há 1 elemento
  $s = @($Samples)
  if (-not $s -or $s.Count -eq 0) { return $null }
  $times = $s | ForEach-Object { $_.ms } | Sort-Object
  $bytes = $s | ForEach-Object { $_.bytes }
  $okCnt = (@($s | Where-Object { $_.ok })).Count
  $n = $s.Count
  $avg = [Math]::Round((@($times) | Measure-Object -Average).Average, 2)
  $min = $times[0]
  $max = $times[-1]
  $p95Index = [Math]::Min([Math]::Ceiling(0.95 * $n) - 1, $n - 1)
  $p95 = $times[$p95Index]
  $avgBytes = [Math]::Round((((@($bytes) | Measure-Object -Average).Average)) / 1024, 2)
  return [PSCustomObject]@{
    runs     = $n
    success  = $okCnt
    successR = if ($n -gt 0) { [Math]::Round(($okCnt * 100.0 / $n), 1) } else { 0 }
    avgMs    = $avg
    minMs    = $min
    p95Ms    = $p95
    maxMs    = $max
    avgKB    = $avgBytes
  }
}

function Discover-ProductIds {
  param([string]$BaseUrl, [int]$MaxIds = 5, [int]$TimeoutSec = 15)
  $url = "$BaseUrl/api/bazaar/items?limit=$MaxIds&page=0"
  try {
    $resp = Invoke-RestMethod -Uri $url -TimeoutSec $TimeoutSec -Headers @{ 'User-Agent' = 'bench-api.ps1' }
    $ids = @()
    foreach ($it in ($resp.items)) {
      $prodId = $it.snapshot.productId  # evitar conflito com $PID
      if ($prodId) { $ids += $prodId }
      if ($ids.Count -ge $MaxIds) { break }
    }
    return @($ids | Select-Object -Unique)  # forçar array
  } catch {
    Write-Warning "Falha a descobrir productIds via $url. Use --MaxIds 0 para ignorar. Erro: $($_.Exception.Message)"
    return @()
  }
}

function Add-CacheBuster {
  param([string]$Url)
  $ticks = [DateTime]::UtcNow.Ticks
  $rnd = [Guid]::NewGuid().ToString('N').Substring(0,8)
  if ($Url -like '*?*') { $sep = '&' } else { $sep = '?' }
  return "${Url}${sep}_=${ticks}${rnd}"
}

# MAIN ajustes (remover logs de parâmetros antigos)
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor Cyan
Write-Host "Repeat fixo: $Repeat" -ForegroundColor DarkCyan

# Randomizar budget (10M - 1000M) para evitar cache de resultados de flipping
$randomBudget = Get-Random -Minimum 10000000 -Maximum 1000000001
Write-Host "Budget aleatorio flipping: $randomBudget" -ForegroundColor DarkCyan

# 1) List endpoint (com cache buster implícito em Measure-Endpoint)
$all = @()
$all += Measure-Endpoint -Name 'list' -Url "$BaseUrl/api/bazaar/items?limit=50&page=0" -Repeat $Repeat -Warmup $Warmup -TimeoutSec $TimeoutSec

# 1b) Flipping heavy (fixo + random budget + parâmetros pesados)
$flipUrl = "$BaseUrl/api/strategies/flipping?sort=score&limit=50&page=0&budget=$randomBudget&horizonHours=6&disableCompetitionPenalties=false&disableRiskPenalties=false&maxTime=6&maxCompetitionPerHour=30&maxRiskScore=0.2"
$all += Measure-Endpoint -Name 'flipping-heavy' -Url $flipUrl -Repeat $Repeat -Warmup $Warmup -TimeoutSec $TimeoutSec

# 2) Discover some product IDs automatically
$ids = @()
if ($MaxIds -gt 0) {
  $ids = Discover-ProductIds -BaseUrl $BaseUrl -MaxIds $MaxIds -TimeoutSec $TimeoutSec
  $ids = @($ids)  # normalizar como array, mesmo quando 1 elemento
  if ($ids.Count -eq 0) { Write-Warning "Nenhum productId descoberto. Continuando apenas com /items." }
  else { Write-Host ("IDs: " + ($ids -join ', ')) -ForegroundColor DarkGray }
}

# 3) For each id, measure detail, history, average
$now = Get-Date
$fromIso = ($now.AddHours(-$HistoryHours).ToUniversalTime()).ToString('o')
$toIso   = ($now.ToUniversalTime()).ToString('o')

foreach ($id in $ids) {
  $all += Measure-Endpoint -Name "detail:$id" -Url "$BaseUrl/api/bazaar/items/$id" -Repeat $Repeat -Warmup $Warmup -TimeoutSec $TimeoutSec
  $histUrl = "$BaseUrl/api/bazaar/items/$id/history?withPoints=$($WithPoints.IsPresent.ToString().ToLower())&from=$fromIso&to=$toIso"
  $all += Measure-Endpoint -Name "history:$id" -Url $histUrl -Repeat $Repeat -Warmup $Warmup -TimeoutSec $TimeoutSec
  $all += Measure-Endpoint -Name "average:$id" -Url "$BaseUrl/api/bazaar/items/$id/average" -Repeat $Repeat -Warmup $Warmup -TimeoutSec $TimeoutSec
}

# Aggregation per logical endpoint (list/detail/history/average)
# Agrupar por prefixo antes dos ':' para consolidar métricas entre ids
$groups = $all | Group-Object -Property { ($_.name -replace ':.*$','') }
$summary = @()
foreach ($g in $groups) {
  $stats = Get-Stats -Samples $g.Group
  if ($null -eq $stats) { continue }
  $summary += [PSCustomObject]@{
    endpoint = $g.Name
    runs     = $stats.runs
    success  = "$($stats.success)/$($stats.runs) ($($stats.successR)%)"
    avgMs    = $stats.avgMs
    minMs    = $stats.minMs
    p95Ms    = $stats.p95Ms
    maxMs    = $stats.maxMs
    avgKB    = $stats.avgKB
  }
}

# Console output
Write-Host "Resumo por endpoint:" -ForegroundColor Green
$summary | Sort-Object endpoint | Format-Table -AutoSize | Out-String | Write-Host

# Optional saves
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($SaveJson) {
  # atualizar para incluir randomBudget
  $existingConfigIndex = ($null)
  # reconstruir JSON simples
  $stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
  $dir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $outJson = Join-Path $dir "bench-results-$stamp.json"
  [PSCustomObject]@{
    baseUrl = $BaseUrl
    config  = @{ repeat=$Repeat; timeoutSec=$TimeoutSec; historyHours=$HistoryHours; withPoints=$WithPoints.IsPresent; maxIds=$MaxIds; flippingBudgetRandom=$randomBudget }
    summary = $summary
    samples = $all
  } | ConvertTo-Json -Depth 6 | Out-File -FilePath $outJson -Encoding utf8
  Write-Host "Salvo JSON: $outJson" -ForegroundColor DarkGreen
}
if ($SaveCsv) {
  $outCsv = Join-Path $dir "bench-samples-$stamp.csv"
  $all | Export-Csv -Path $outCsv -NoTypeInformation -Encoding UTF8
  Write-Host "Salvo CSV: $outCsv" -ForegroundColor DarkGreen
}

Write-Host "Concluido." -ForegroundColor Cyan
