# PowerShell script to test ML chat functionality

# First, login to get a token
$loginBody = @{
    email = "test@example.com"
    password = "test123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = ($loginResponse.Content | ConvertFrom-Json).token

Write-Host "Login successful, token received"

# Ask a question
$chatBody = @{
    question = "What is the total budget allocated to Engineering?"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$chatUri = "http://localhost:8000/api/ml/chat"

try {
    $chatResponse = Invoke-WebRequest -Uri $chatUri -Method POST -Body $chatBody -Headers $headers
    Write-Host "Chat Response:" $chatResponse.Content
} catch {
    Write-Host "Chat Error:" $_.Exception.Message
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response Body:" $responseBody
    }
}