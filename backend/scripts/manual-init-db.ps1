# Manual PostgreSQL initialization script for Canvas App
# Usage (PowerShell):
#   $env:PGPASSWORD="<password>"
#   psql -h <host> -U postgres -p <port> -d railway -f prisma/init-postgres.sql

param(
  [string]$HostName = "caboose.proxy.rlwy.net",
  [int]$Port = 23072,
  [string]$Database = "railway",
  [string]$User = "postgres",
  [SecureString]$Password
)

if (-not $Password) {
  Write-Host "Provide -Password (as SecureString) or set PGPASSWORD env var" -ForegroundColor Yellow
  exit 1
}

# Convert SecureString to plain text for psql (process environment variable)
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
$env:PGPASSWORD = $plain

Write-Host ("Creating tables on {0}:{1}/{2} ..." -f $HostName,$Port,$Database) -ForegroundColor Cyan
psql -h $HostName -U $User -p $Port -d $Database -f prisma/init-postgres.sql

# Clear sensitive variable
Remove-Variable plain -ErrorAction SilentlyContinue
