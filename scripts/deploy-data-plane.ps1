# Deploy CloudFormation data plane to ap-southeast-2
$ErrorActionPreference = "Stop"
$Region = "ap-southeast-2"
$StackName = "visbuild-shopify-data"
$Root = Split-Path -Parent $PSScriptRoot

Push-Location $Root
try {
  $status = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].StackStatus" `
    --output text 2>$null
  if ($status -eq "ROLLBACK_COMPLETE") {
    Write-Host "Stack is ROLLBACK_COMPLETE — deleting before redeploy..." -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name $StackName --region $Region
    aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
  }

  aws cloudformation deploy `
    --template-file infra/template.yaml `
    --stack-name $StackName `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides AppTableName=visbuild-shopify-app `
    --region $Region

  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`n--- Stack Outputs ---" -ForegroundColor Cyan
  aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table
}
finally {
  Pop-Location
}
