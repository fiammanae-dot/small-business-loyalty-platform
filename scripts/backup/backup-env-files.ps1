$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackupDir = Join-Path $ProjectRoot "backups"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupFile = Join-Path $BackupDir "loyaltybase_env_$Timestamp.zip"
$EnvFiles = @(".env", ".env.pilot", ".env.example")

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

if (Test-Path $BackupFile) {
  Write-Error "Backup file already exists and will not be overwritten: $BackupFile"
}

$ExistingFiles = @()
foreach ($FileName in $EnvFiles) {
  $Path = Join-Path $ProjectRoot $FileName
  if (Test-Path $Path) {
    $ExistingFiles += $Path
  }
}

if ($ExistingFiles.Count -eq 0) {
  Write-Error "No environment files found to back up."
}

Write-Host "Creating environment files backup..."
Write-Host "Output: $BackupFile"

Compress-Archive -Path $ExistingFiles -DestinationPath $BackupFile -CompressionLevel Optimal

if (-not (Test-Path $BackupFile)) {
  Write-Error "Environment backup failed: $BackupFile"
}

$BackupSize = (Get-Item $BackupFile).Length
if ($BackupSize -le 0) {
  Write-Error "Environment backup file is empty: $BackupFile"
}

Write-Host "Environment backup completed successfully."
Write-Host "File: $BackupFile"
Write-Host "Size: $BackupSize bytes"
