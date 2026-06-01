# Build and upload Publish Lambda bundle (ap-southeast-2)
# REQUIRED: esbuild --format=cjs (see scripts/verify-lambda-bundle.mjs)
$ErrorActionPreference = "Stop"
$Region = "ap-southeast-2"
$FunctionName = "visbuild-shopify-data-publish"
$Root = Split-Path -Parent $PSScriptRoot
$DistDir = Join-Path $Root "infra\dist\publish"
$ZipPath = Join-Path $Root "infra\dist\publish.zip"

Push-Location $Root
try {
  npm run build:lambda
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  npm run verify:lambda-bundle
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if (-not (Test-Path $DistDir)) {
    throw "Missing $DistDir — build:lambda failed"
  }

  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $ZipPath

  Write-Host "Updating Lambda $FunctionName in $Region ..." -ForegroundColor Cyan
  aws lambda update-function-code `
    --function-name $FunctionName `
    --zip-file "fileb://$ZipPath" `
    --region $Region

  if ($LASTEXITCODE -ne 0) {
    Write-Host "If function name differs, list functions:" -ForegroundColor Yellow
    aws lambda list-functions --region $Region --query "Functions[?contains(FunctionName,'publish')].FunctionName"
    exit $LASTEXITCODE
  }

  Write-Host "Done." -ForegroundColor Green
}
finally {
  Pop-Location
}
