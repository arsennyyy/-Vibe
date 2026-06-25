# Load Test: 100 requests to API
$url = "http://localhost:5064/api/Events"
$totalRequests = 100
$success = 0
$errors = 0
$times = @()

Write-Host "Starting load test: $totalRequests requests"
Write-Host "URL: $url"
Write-Host "========================================"

$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($i = 1; $i -le $totalRequests; $i++) {
    $reqTime = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        $reqTime.Stop()
        if ($response.StatusCode -eq 200) {
            $success++
            $times += $reqTime.Elapsed.TotalMilliseconds
        } else {
            $errors++
        }
    } catch {
        $errors++
    }
    if ($i % 10 -eq 0) {
        Write-Host "Progress: $i/$totalRequests"
    }
}

$sw.Stop()

Write-Host ""
Write-Host "RESULTS"
Write-Host "========================================"
Write-Host "Total requests: $totalRequests"
Write-Host "Success (200): $success"
Write-Host "Errors: $errors"
Write-Host "Total time: $([math]::Round($sw.Elapsed.TotalSeconds, 2)) sec"
if ($times.Count -gt 0) {
    $avg = ($times | Measure-Object -Average).Average
    $max = ($times | Measure-Object -Maximum).Maximum
    $min = ($times | Measure-Object -Minimum).Minimum
    Write-Host "Average response time: $([math]::Round($avg, 0)) ms"
    Write-Host "Max response time: $([math]::Round($max, 0)) ms"
    Write-Host "Min response time: $([math]::Round($min, 0)) ms"
} else {
    Write-Host "No successful responses received."
    Write-Host "Check that the server is running and the URL is correct."
}