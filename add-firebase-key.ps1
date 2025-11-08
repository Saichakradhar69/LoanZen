# PowerShell script to add Firebase service account key to .env.local
# Run this script: .\add-firebase-key.ps1

$envFile = ".env.local"
$firebaseKey = '{"type":"service_account","project_id":"loanzen-fbskl","private_key_id":"a47ac7872475ccf1f15a3edfe16118c5ae97babe","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC6Yx/kIapBvIuy\negxGLElIlN2hUIRw6zSG88OWkFn5KxwMiteFrcg0V2kdXrm+NIJPFWLqXRCIDDKa\nRzAidk04NjROuOL1AvNTLenMn+QvkEbMok5ksWEAaDzMOn1bNM2s+ejc6RmcRrtW\nHjJCUwFQs9l2jN1hOti1/QhESIJYx2A4CO/JeckD7uNVIoY1xBWhVMH/YhKP9+WP\nhby2O99eHkOtLMy3r9fBdiZHv5vuZF60gihzTO/Wcr4BwLqrkHppMGfoOe0umwhN\nC7m2GEtD4zwd7I+/ZEpHhEc+s2idhCcnq9Guhbcf1V8qXiPSulnucrnFced+msz8\nqrMPBhKPAgMBAAECggEAJLo3pIqFtCJlHKw0EvfTEPxUl9732hBe72DFX7veHt1B\nz67kPTE7TCUVT3ZE/5f1PYQnU6s3ALf2mLQCZigNm1ADCqggAMuuCuv3MB0pp720\nVcp9zBWv2ZawtEWqQfirtrQgELfWFhdR/uxAVxVoIvDtnxCu5uPjpCjSIjJvjPKW\nL3hlyL5wfMt8QcpJ5MG9ngVGsXNH5MLn8MwnvYPsegzppRFHAFakLt8gPT48l08c\n0sNUBDEwjpYTAhR9x/9FedI2cqPlMsL7KYItRvPBjBqv30Epn9EVisUMu3pXb0Y3\nSmSEkh2WGIk0XKEn7221BPQA8SigZERiaILjXIFb0QKBgQDvQh5bqf+mWqycuyy4\n5SV2WTtRGTyNp92+4aL++cWZhzk2kCFb9VGC3K61buY0OzkrrePgEyIZIB0WLrjd\n5FSLfIWguvzvdP72WVDcT3d4/dWmRjm6WDmfZvk+ACygjJMgWTrNb7jp32/wLd6u\nHw4EQ+f8b5dDbZperlcqO6DIswKBgQDHbep5dSZMJaG5gzEo4ObkHQZvnawsS4VN\nf9qQMDzTGhGUqqUmbc8JkwBP5KeSfOXk2Dp53U8FgAF+RXYprv0uxiLxQ8pgCUvd\nsBDX6EDJZUAitYrF140z5lHgCmjALx6mIp2ZqXJxOorXqEwlPyh1zoVjq7K5siaj\nGQ4JNuUktQKBgDo5wAOUund0h59Y2chhU52al5nj512d5ZQHe1BL3q+/PcguiT/E\n0sJjDE1xIKrDYuVjWxpz7Y9pxkpYsnqlj4GmmyqDdvybX1T6ZXhICo4yT+U4H+Je\niB9nwu44wqOLsl5j+LB4KOsZijdMIm4DdrjJAdLoIUqyiKfUC7hmbHmLAoGAL4Ny\nf6l3jGDS3R3ykmiy2dpIdEM+h/ceNU6mxf+YHjtxwNe/LR6wWvmY82/otK/pHdKe\na/ZcI1VSBcGK23eDfqdaH90k1Cii2JhgCvCcrt7enuZdv7ERRTI0g4o3VsJjLPXG\nUpvaVju6ZJMGQUGA5EBl608276MQLX+EppFbmpkCgYBu04URlb87TUa0au295DvT\naINCfC8S1JfJ3M6lUyOWWG7kgU95DEO27F+0RsSx0IX2AwgBh9cN0K/l36pb8GUz\niz/v4qVUzDTCxiTNOqUU7xrLe74FnlJ21sjQVTtz5hQP/3VfpC/TqA3MZ5b+29Jy\njH6d0nQtOA3ECU0c/8vQIA==\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@loanzen-fbskl.iam.gserviceaccount.com","client_id":"105266264519881332603","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40loanzen-fbskl.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'

# Check if .env.local exists
if (Test-Path $envFile) {
    Write-Host "✅ Found .env.local file"
    
    # Check if FIREBASE_SERVICE_ACCOUNT_KEY already exists
    $content = Get-Content $envFile -Raw
    if ($content -match "FIREBASE_SERVICE_ACCOUNT_KEY") {
        Write-Host "⚠️  FIREBASE_SERVICE_ACCOUNT_KEY already exists. Updating..."
        $content = $content -replace 'FIREBASE_SERVICE_ACCOUNT_KEY=.*', "FIREBASE_SERVICE_ACCOUNT_KEY=$firebaseKey"
        $content = $content -replace 'FIREBASE_PROJECT_ID=.*', "FIREBASE_PROJECT_ID=loanzen-fbskl"
    } else {
        Write-Host "➕ Adding Firebase service account key..."
        $content += "`n`n# Firebase Admin SDK Configuration`n"
        $content += "FIREBASE_SERVICE_ACCOUNT_KEY=$firebaseKey`n"
        $content += "FIREBASE_PROJECT_ID=loanzen-fbskl`n"
    }
    
    Set-Content -Path $envFile -Value $content
    Write-Host "✅ Firebase service account key added to .env.local"
} else {
    Write-Host "❌ .env.local file not found. Creating it..."
    $content = "# Firebase Admin SDK Configuration`n"
    $content += "FIREBASE_SERVICE_ACCOUNT_KEY=$firebaseKey`n"
    $content += "FIREBASE_PROJECT_ID=loanzen-fbskl`n"
    Set-Content -Path $envFile -Value $content
    Write-Host "✅ Created .env.local with Firebase service account key"
}

Write-Host "`n🎉 Done! Now restart your dev server (npm run dev)"

