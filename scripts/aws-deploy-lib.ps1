# Shared helpers for CloudFormation + Lambda deploy scripts.
$ErrorActionPreference = "Stop"

$env:PYTHONIOENCODING = "utf-8"
$env:AWS_CLI_FILE_ENCODING = "UTF-8"

function Get-RepoRoot {
  return (Split-Path -Parent $PSScriptRoot)
}

function Get-DeployConfig {
  param([string]$Root = (Get-RepoRoot))

  $configPath = Join-Path $Root "infra\deploy.config.json"
  $examplePath = Join-Path $Root "infra\deploy.config.example.json"
  $source = if (Test-Path $configPath) { $configPath } else { $examplePath }

  if (-not (Test-Path $source)) {
    throw "Missing infra/deploy.config.json (copy from deploy.config.example.json)"
  }

  $raw = Get-Content $source -Raw | ConvertFrom-Json

  $origins = @($raw.assetsCorsAllowedOrigins | ForEach-Object { "$_" })
  if ($raw.amplifyAppUrl -and ($origins -notcontains $raw.amplifyAppUrl)) {
    $origins = @($raw.amplifyAppUrl) + $origins
  }

  return [PSCustomObject]@{
    AwsAccountId               = if ($raw.awsAccountId) { [string]$raw.awsAccountId } else { "" }
    Region                     = if ($raw.region) { [string]$raw.region } else { "ap-southeast-2" }
    StackName                  = if ($raw.stackName) { [string]$raw.stackName } else { "visbuild-shopify-data" }
    AppTableName               = if ($raw.appTableName) { [string]$raw.appTableName } else { "visbuild-shopify-app" }
    ShopifyTokenSecretPrefix   = if ($raw.shopifyTokenSecretPrefix) { [string]$raw.shopifyTokenSecretPrefix } else { "visbuild-shopify/token" }
    AssetsBucketName           = if ($raw.assetsBucketName) { [string]$raw.assetsBucketName } else { "" }
    AssetsCorsAllowedOrigins   = $origins
    AmplifyAppUrl              = if ($raw.amplifyAppUrl) { [string]$raw.amplifyAppUrl } else { "" }
  }
}

function Get-AwsAccountId {
  param(
    [string]$Region,
    [string]$FallbackBucketName = "",
    [string]$ConfigAccountId = ""
  )

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $account = (aws sts get-caller-identity --query Account --output text --region $Region 2>$null)
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap

  if ($exit -eq 0 -and $account) {
    return "$account".Trim()
  }

  if ($ConfigAccountId -match "^\d{12}$") {
    Write-Host "AWS CLI unavailable — using awsAccountId from deploy.config.json." -ForegroundColor Yellow
    return $ConfigAccountId
  }

  if ($FallbackBucketName -match "(\d{12})") {
    Write-Host "AWS CLI unavailable — using account id from bucket name." -ForegroundColor Yellow
    return $Matches[1]
  }

  throw "AWS CLI not authenticated. Run 'aws configure' or set awsAccountId in infra/deploy.config.json."
}

function Resolve-AssetsBucketName {
  param(
    [Parameter(Mandatory = $true)] $Config,
    [Parameter(Mandatory = $true)] [string]$AccountId
  )

  if ($Config.AssetsBucketName) {
    return $Config.AssetsBucketName
  }
  return "visbuild-media-$AccountId"
}

function Join-CorsParameterValue {
  param([string[]]$Origins)

  $unique = @($Origins | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() } | Select-Object -Unique)
  if ($unique.Count -eq 0) {
    return "*"
  }
  return ($unique -join ",")
}

function Get-StackOutputs {
  param(
    [string]$StackName,
    [string]$Region
  )

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $json = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json 2>$null
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap

  if ($exit -ne 0 -or -not $json) {
    return @{}
  }

  $map = @{}
  ($json | ConvertFrom-Json) | ForEach-Object {
    $map[$_.OutputKey] = $_.OutputValue
  }
  return $map
}

function Get-OutputValue {
  param(
    [hashtable]$Outputs,
    [string[]]$Keys
  )

  foreach ($key in $Keys) {
    if ($Outputs.ContainsKey($key) -and $Outputs[$key]) {
      return $Outputs[$key]
    }
  }
  return $null
}

function Get-PublishLambdaName {
  param([string]$StackName)
  return "$StackName-publish"
}

function Get-ScheduleLambdaName {
  param([string]$StackName)
  return "$StackName-schedule"
}
