# Build and upload Publish Lambda bundle.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "aws-deploy-lib.ps1")

$config = Get-DeployConfig
$Region = $config.Region
$FunctionName = Get-PublishLambdaName -StackName $config.StackName
$Root = Get-RepoRoot
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
