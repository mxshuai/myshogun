$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env.production.local"

function Import-EnvFile([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Missing $Path. Copy .env.production.local.example to .env.production.local first."
  }

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

Push-Location $Root
try {
  Import-EnvFile -Path $EnvFile

  $required = @(
    "USE_AWS_DATA_LAYER",
    "APP_AWS_REGION",
    "APP_TABLE_NAME",
    "PUBLISH_LAMBDA_ARN",
    "SCHEDULER_ROLE_ARN",
    "SHOPIFY_TOKEN_SECRET_PREFIX"
  )

  foreach ($name in $required) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
      throw "Missing required env: $name (check .env.production.local)"
    }
  }

  if (-not $env:PORT) {
    $env:PORT = "3000"
  }

  Write-Host "Building production bundle..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("ADMIN_API_KEY", "Process"))) {
    Write-Host "ADMIN_API_KEY not set — admin routes are open (scheme B, no login)." -ForegroundColor Yellow
  }

  Write-Host "Starting local production server at http://localhost:$($env:PORT)" -ForegroundColor Green
  npm run preview:amplify
}
finally {
  Pop-Location
}
