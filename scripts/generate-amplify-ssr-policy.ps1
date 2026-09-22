# Regenerate infra/amplify-ssr-iam-policy.json from deploy.config.json + stack outputs.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "aws-deploy-lib.ps1")

$Root = Get-RepoRoot
$config = Get-DeployConfig -Root $Root

$region = [string]$config.Region
$stackName = [string]$config.StackName
$table = [string]$config.AppTableName
$secretPrefix = [string]$config.ShopifyTokenSecretPrefix
$configBucket = [string]$config.AssetsBucketName
$configAccount = [string]$config.AwsAccountId

$accountId = Get-AwsAccountId -Region $region -FallbackBucketName $configBucket -ConfigAccountId $configAccount
$bucket = if ($configBucket) { $configBucket } else { "visbuild-media-$accountId" }

$scheduleLambda = Get-ScheduleLambdaName -StackName $stackName

$policy = @{
  Version   = "2012-10-17"
  Statement = @(
    @{
      Sid      = "DynamoDBAppTable"
      Effect   = "Allow"
      Action   = @(
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
        "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan",
        "dynamodb:BatchGetItem", "dynamodb:BatchWriteItem"
      )
      Resource = @(
        "arn:aws:dynamodb:${region}:${accountId}:table/${table}",
        "arn:aws:dynamodb:${region}:${accountId}:table/${table}/index/*"
      )
    },
    @{
      Sid      = "SecretsManagerShopifyTokens"
      Effect   = "Allow"
      Action   = @(
        "secretsmanager:GetSecretValue", "secretsmanager:PutSecretValue",
        "secretsmanager:CreateSecret", "secretsmanager:DescribeSecret",
        "secretsmanager:TagResource"
      )
      Resource = "arn:aws:secretsmanager:${region}:${accountId}:secret:${secretPrefix}/*"
    },
    @{
      Sid      = "InvokeScheduleLambda"
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = "arn:aws:lambda:${region}:${accountId}:function:${scheduleLambda}"
    },
    @{
      Sid      = "S3MediaUpload"
      Effect   = "Allow"
      Action   = @("s3:PutObject", "s3:GetObject")
      Resource = "arn:aws:s3:::${bucket}/uploads/*"
    }
  )
}

$outPath = Join-Path $Root "infra\amplify-ssr-iam-policy.json"
$json = $policy | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outPath, $json)

Write-Host "Wrote $outPath" -ForegroundColor Green
Write-Host "  Assets bucket: $bucket" -ForegroundColor Cyan
Write-Host "  Attach this policy to the Amplify SSR compute role (IAM console)." -ForegroundColor Yellow
