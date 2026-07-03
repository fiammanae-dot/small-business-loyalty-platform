$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackupDir = Join-Path $ProjectRoot "backups"
$PgDump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$DbHost = $env:PGHOST
$DbPort = if ($env:PGPORT) { $env:PGPORT } else { "5432" }
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupFile = Join-Path $BackupDir "Loyalty Card UAE_pilot_$Timestamp.backup"

if (-not $DbHost) {
  Write-Error "PGHOST is required. Set it to the PostgreSQL host before running this backup."
}

if (-not (Test-Path $PgDump)) {
  Write-Error "pg_dump was not found at $PgDump. Update the script with the correct PostgreSQL bin path."
}

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

if (Test-Path $BackupFile) {
  Write-Error "Backup file already exists and will not be overwritten: $BackupFile"
}

Write-Host "Creating pilot database backup..."
Write-Host "Database: loyalty_platform_pilot"
Write-Host "Output: $BackupFile"

& $PgDump -U postgres -h $DbHost -p $DbPort -d loyalty_platform_pilot -Fc -f $BackupFile

if ($LASTEXITCODE -ne 0) {
  Write-Error "Backup failed for loyalty_platform_pilot."
}

if (-not (Test-Path $BackupFile)) {
  Write-Error "Backup command completed but file was not found: $BackupFile"
}

$BackupSize = (Get-Item $BackupFile).Length
if ($BackupSize -le 0) {
  Write-Error "Backup file is empty: $BackupFile"
}

Write-Host "Backup completed successfully."
Write-Host "File: $BackupFile"
Write-Host "Size: $BackupSize bytes"
