# Print Amplify Hosting environment variables from deploy.config + CloudFormation outputs.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "aws-deploy-lib.ps1")

$config = Get-DeployConfig
$accountId = Get-AwsAccountId -Region $config.Region -FallbackBucketName $config.AssetsBucketName -ConfigAccountId $config.AwsAccountId
$bucket = Resolve-AssetsBucketName -Config $config -AccountId $accountId
$outputs = Get-StackOutputs -StackName $config.StackName -Region $config.Region

$publishArn = Get-OutputValue -Outputs $outputs -Keys @("PublishLambdaArn")
$schedulerRoleArn = Get-OutputValue -Outputs $outputs -Keys @("SchedulerRoleArn")
$scheduleArn = Get-OutputValue -Outputs $outputs -Keys @("ScheduleLambdaArn")
$tableName = Get-OutputValue -Outputs $outputs -Keys @("AppTableName") 
if (-not $tableName) { $tableName = $config.AppTableName }
Write-Host "`n=== Amplify Environment Variables ===" -ForegroundColor Cyan
Write-Host "Paste into Amplify Console -> Hosting -> Environment variables`n"

$rows = @(
  @{ Name = "USE_AWS_DATA_LAYER"; Value = "true" },
  @{ Name = "APP_AWS_REGION"; Value = $config.Region },
  @{ Name = "APP_TABLE_NAME"; Value = $tableName },
  @{ Name = "PUBLISH_LAMBDA_ARN"; Value = $(if ($publishArn) { $publishArn } else { "(deploy data plane first)" }) },
  @{ Name = "SCHEDULER_ROLE_ARN"; Value = $(if ($schedulerRoleArn) { $schedulerRoleArn } else { "(deploy data plane first)" }) },
  @{ Name = "SCHEDULE_LAMBDA_ARN"; Value = $(if ($scheduleArn) { $scheduleArn } else { "(deploy data plane first)" }) },
  @{ Name = "ASSETS_BUCKET_NAME"; Value = $bucket },
  @{ Name = "SHOPIFY_TOKEN_SECRET_PREFIX"; Value = $config.ShopifyTokenSecretPrefix }
)

$rows | ForEach-Object {
  Write-Host ("{0}={1}" -f $_.Name, $_.Value)
}

Write-Host "`nAlso configure (app-specific, not from stack):" -ForegroundColor Yellow
Write-Host "SHOPIFY_API_KEY / SHOPIFY_API_SECRET / SCOPES (include read_files) / SHOPIFY_APP_URL"
if ($config.AmplifyAppUrl) {
  Write-Host "SHOPIFY_APP_URL=$($config.AmplifyAppUrl)"
}

Write-Host "`nS3 media bucket CORS origins (from deploy.config.json):" -ForegroundColor Yellow
Write-Host (Join-CorsParameterValue -Origins $config.AssetsCorsAllowedOrigins)
