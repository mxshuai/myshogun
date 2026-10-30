# Unified AWS deploy: data plane (DDB + Lambdas + S3 media) + lambda bundles + IAM policy + env checklist.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "aws-deploy-lib.ps1")

$Root = Get-RepoRoot
$config = Get-DeployConfig -Root $Root
$accountId = Get-AwsAccountId -Region $config.Region -FallbackBucketName $config.AssetsBucketName -ConfigAccountId $config.AwsAccountId
$bucket = Resolve-AssetsBucketName -Config $config -AccountId $accountId
$cors = Join-CorsParameterValue -Origins $config.AssetsCorsAllowedOrigins

Write-Host "=== Visbuild AWS deploy ===" -ForegroundColor Cyan
Write-Host "Region:  $($config.Region)"
Write-Host "Stack:   $($config.StackName)"
Write-Host "Account: $accountId"
Write-Host "Media:   $bucket"
Write-Host ""

Push-Location $Root
try {
  Write-Host "[1/4] CloudFormation data plane + S3 media bucket..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "deploy-data-plane.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`n[2/4] Publish Lambda bundle..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "deploy-publish-lambda.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`n[3/4] Schedule Lambda bundle..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "deploy-schedule-lambda.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`n[4/4] Generate Amplify SSR IAM policy..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "generate-amplify-ssr-policy.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`n=== Deploy complete ===" -ForegroundColor Green
  & (Join-Path $PSScriptRoot "print-amplify-env.ps1")
}
finally {
  Pop-Location
}
