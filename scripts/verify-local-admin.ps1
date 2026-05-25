param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env.production.local"

function Import-EnvFile([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    [Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

function Invoke-Step([string]$Name, [scriptblock]$Action) {
  try {
    & $Action
    Write-Host "PASS: $Name" -ForegroundColor Green
  } catch {
    Write-Host "FAIL: $Name`n$($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

Push-Location $Root
try {
  Import-EnvFile -Path $EnvFile

  if (-not $ApiKey) {
    $ApiKey = $env:ADMIN_API_KEY
  }
  $authDisabled = [string]::IsNullOrWhiteSpace($ApiKey)

  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

  Invoke-Step "GET /admin/login should be 200" {
    $res = Invoke-WebRequest -Uri "$BaseUrl/admin/login" -WebSession $session -TimeoutSec 20 -UseBasicParsing
    if ([int]$res.StatusCode -ne 200) {
      throw "Expected 200, got $($res.StatusCode)"
    }
  }

  if ($authDisabled) {
    Write-Host "SKIP: POST /admin/login.data (ADMIN_API_KEY not set)" -ForegroundColor Yellow
  } else {
    Invoke-Step "POST /admin/login.data should redirect" {
      $body = @{
        next = "/admin/shops"
        apiKey = $ApiKey
      }
      $res = Invoke-WebRequest `
        -Uri "$BaseUrl/admin/login.data" `
        -Method Post `
        -Body $body `
        -WebSession $session `
        -TimeoutSec 20 `
        -UseBasicParsing

      $text = $res.Content
      if (-not $text -or $text -notmatch "/admin/shops") {
        throw "Unexpected response payload: $text"
      }
    }
  }

  Invoke-Step "GET /admin/shops should not be 500" {
    try {
      $res = Invoke-WebRequest -Uri "$BaseUrl/admin/shops" -WebSession $session -TimeoutSec 20 -UseBasicParsing
      if ([int]$res.StatusCode -ge 500) {
        throw "Expected non-500, got $($res.StatusCode)"
      }
    } catch {
      if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        if ($status -ge 500) { throw "Expected non-500, got $status" }
      } else {
        throw
      }
    }
  }

  Write-Host "`nLocal admin smoke test passed." -ForegroundColor Cyan
}
finally {
  Pop-Location
}
