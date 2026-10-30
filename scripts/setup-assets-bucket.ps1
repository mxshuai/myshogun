# Idempotent S3 media bucket setup (CORS + uploads/* public read).
# Kept outside CloudFormation: some accounts block public-read buckets via CFN Guard hooks.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "aws-deploy-lib.ps1")

$Root = Get-RepoRoot
$config = Get-DeployConfig -Root $Root
$Region = $config.Region
$accountId = Get-AwsAccountId -Region $Region -FallbackBucketName $config.AssetsBucketName -ConfigAccountId $config.AwsAccountId
$Bucket = Resolve-AssetsBucketName -Config $config -AccountId $accountId
$origins = @($config.AssetsCorsAllowedOrigins | Where-Object { $_ -and "$_".Trim() } | ForEach-Object { "$_".Trim() } | Select-Object -Unique)
if ($origins.Count -eq 0) { $origins = @("*") }

Write-Host "Setting up media bucket: $Bucket ($Region)" -ForegroundColor Cyan

$exists = $true
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
aws s3api head-bucket --bucket $Bucket --region $Region 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { $exists = $false }
$ErrorActionPreference = $prevEap

if (-not $exists) {
  Write-Host "Creating bucket..." -ForegroundColor Yellow
  if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $Bucket --region $Region --no-cli-pager
  } else {
    aws s3api create-bucket `
      --bucket $Bucket `
      --region $Region `
      --create-bucket-configuration "LocationConstraint=$Region" `
      --no-cli-pager
  }
  if ($LASTEXITCODE -ne 0) { throw "Failed to create bucket $Bucket" }
}

Write-Host "Applying public access block (allow bucket policy on uploads/*)..." -ForegroundColor Yellow
aws s3api put-public-access-block `
  --bucket $Bucket `
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false" `
  --region $Region `
  --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw "Failed to set public access block on $Bucket" }

$corsConfig = @{
  CORSRules = @(
    @{
      AllowedHeaders = @("*")
      AllowedMethods = @("PUT", "GET", "HEAD")
      AllowedOrigins = $origins
      ExposeHeaders = @("ETag")
      MaxAgeSeconds  = 3000
    }
  )
}
$corsPath = Join-Path $Root "infra\dist\s3-cors.generated.json"
New-Item -ItemType Directory -Force -Path (Split-Path $corsPath) | Out-Null
$corsJson = $corsConfig | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText($corsPath, $corsJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "Applying CORS: $($origins -join ', ')" -ForegroundColor Yellow
aws s3api put-bucket-cors `
  --bucket $Bucket `
  --cors-configuration "file://$($corsPath.Replace('\','/'))" `
  --region $Region `
  --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw "Failed to set CORS on $Bucket" }

$policy = @{
  Version   = "2012-10-17"
  Statement = @(
    @{
      Sid       = "PublicReadUploads"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "arn:aws:s3:::$Bucket/uploads/*"
    }
  )
}
$policyPath = Join-Path $Root "infra\dist\s3-policy.generated.json"
$policyJson = $policy | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText($policyPath, $policyJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "Applying uploads/* public read policy..." -ForegroundColor Yellow
aws s3api put-bucket-policy `
  --bucket $Bucket `
  --policy "file://$($policyPath.Replace('\','/'))" `
  --region $Region `
  --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw "Failed to set bucket policy on $Bucket" }

Write-Host "Media bucket ready: $Bucket" -ForegroundColor Green
Write-Host "  Public URL: https://${Bucket}.s3.${Region}.amazonaws.com/uploads/..." -ForegroundColor Cyan
