# Deploy CloudFormation data plane (DynamoDB, Publish/Schedule Lambdas, S3 media bucket).
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "aws-deploy-lib.ps1")

$Root = Get-RepoRoot
$config = Get-DeployConfig -Root $Root
$Region = $config.Region
$StackName = $config.StackName
Push-Location $Root
try {
  $status = Get-CfnStackStatus -StackName $StackName -Region $Region
  if ($status -eq "ROLLBACK_COMPLETE") {
    Write-Host "Stack is ROLLBACK_COMPLETE — deleting before redeploy..." -ForegroundColor Yellow
    $exit = Invoke-AwsCli cloudformation delete-stack --stack-name $StackName --region $Region
    if ($exit -ne 0) { exit $exit }
    $exit = Invoke-AwsCli cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
    if ($exit -ne 0) { exit $exit }
  }

  Write-Host "Deploying stack $StackName ($Region)..." -ForegroundColor Cyan
  Write-Host "  AppTableName=$($config.AppTableName)"

  $exit = Invoke-AwsCli cloudformation deploy `
    --template-file infra/template.yaml `
    --stack-name $StackName `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides "AppTableName=$($config.AppTableName)" `
    --region $Region
  if ($exit -ne 0) { exit $exit }

  Write-Host "`nSetting up S3 media bucket (outside CloudFormation)..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "setup-assets-bucket.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`n--- Stack Outputs ---" -ForegroundColor Cyan
  $exit = Invoke-AwsCli cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table
  if ($exit -ne 0) { exit $exit }
}
finally {
  Pop-Location
}
