#!/usr/bin/env pwsh
# Broadcaster License Generator - PowerShell Wrapper

param(
    [string]$Type = "user",
    [int]$Count = 1,
    [int]$Validity = 365,
    [string]$Customer,
    [string]$Format = "table",
    [switch]$Save,
    [switch]$Help
)

if ($Help -or $args.Count -eq 0 -and $Type -eq "user" -and $Count -eq 1) {
    Write-Host ""
    Write-Host "Broadcaster License Generator" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: ./generate-license.ps1 [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Type <type>         License type: master, distributor, user (default: user)"
    Write-Host "  -Count <number>      Number of licenses (default: 1)"
    Write-Host "  -Validity <days>     Validity in days (default: 365)"
    Write-Host "  -Customer <name>     Customer name (optional)"
    Write-Host "  -Format <format>     Output format: table, json, csv (default: table)"
    Write-Host "  -Save                Save to database"
    Write-Host "  -Help                Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./generate-license.ps1"
    Write-Host "  ./generate-license.ps1 -Type user -Count 50 -Customer 'ABC Corp' -Format csv -Save"
    Write-Host ""
    exit 0
}

# Build the command
$cmd = "npx ts-node src/cli/license-generator.ts"
$cmd += " --type $Type"
$cmd += " --count $Count"
$cmd += " --validity $Validity"
if ($Customer) {
    $cmd += " --customer `"$Customer`""
}
$cmd += " --format $Format"
if ($Save) {
    $cmd += " --save"
}

# Execute
Invoke-Expression $cmd
