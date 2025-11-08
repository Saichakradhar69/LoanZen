# Fix FIREBASE_SERVICE_ACCOUNT_KEY format in .env.local
# The key needs to be wrapped in single quotes for proper parsing

$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env.local file not found!"
    exit 1
}

Write-Host "📝 Reading .env.local file..."

$lines = Get-Content $envFile
$newLines = @()
$fixed = $false

foreach ($line in $lines) {
    if ($line -match '^FIREBASE_SERVICE_ACCOUNT_KEY=') {
        # Check if already quoted (starts with single quote after =)
        $valueStart = $line.IndexOf('=') + 1
        $firstChar = $line.Substring($valueStart, 1)
        
        if ($firstChar -eq [char]39) {
            Write-Host "✅ FIREBASE_SERVICE_ACCOUNT_KEY is already quoted correctly"
            $newLines += $line
        } else {
            # Extract the JSON value (everything after =)
            $jsonValue = $line.Substring($valueStart)
            # Wrap in single quotes
            $newLine = "FIREBASE_SERVICE_ACCOUNT_KEY=" + [char]39 + $jsonValue + [char]39
            $newLines += $newLine
            Write-Host "✅ Fixed FIREBASE_SERVICE_ACCOUNT_KEY format"
            $fixed = $true
        }
    } else {
        $newLines += $line
    }
}

if ($fixed) {
    Set-Content -Path $envFile -Value ($newLines -join "`n")
    Write-Host "✅ Updated .env.local file"
    Write-Host "🔄 Please restart your dev server (npm run dev)"
} else {
    Write-Host "ℹ️  No changes needed"
}
