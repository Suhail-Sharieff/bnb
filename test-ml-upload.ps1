# PowerShell script to test ML file upload

# First, login to get a token
$loginBody = @{
    email = "test@example.com"
    password = "test123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = ($loginResponse.Content | ConvertFrom-Json).token

Write-Host "Login successful, token received"

# Now upload the file
$filePath = "c:\Users\vyash\OneDrive\Desktop\Blockchain\test-data.csv"
$uploadUri = "http://localhost:8000/api/ml/upload"

# Create a multipart form data request
$boundary = [System.Guid]::NewGuid().ToString()
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "multipart/form-data; boundary=`"$boundary`""
}

# Create the form data
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileEnc = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes)

$bodyLines = @(
    "--$boundary",
    'Content-Disposition: form-data; name="file"; filename="test-data.csv"',
    "Content-Type: text/csv",
    "",
    $fileEnc,
    "--$boundary--"
)

$body = [string]::Join("`r`n", $bodyLines)

try {
    $uploadResponse = Invoke-WebRequest -Uri $uploadUri -Method POST -Body $body -Headers $headers
    Write-Host "Upload Response:" $uploadResponse.Content
} catch {
    Write-Host "Upload Error:" $_.Exception.Message
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response Body:" $responseBody
    }
}