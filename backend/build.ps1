# Останавливает запущенный бэкенд, чтобы не блокировался MyMvcBackend.exe при сборке
Get-Process -Name "MyMvcBackend" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 400

$ErrorActionPreference = "Stop"
dotnet build @args
exit $LASTEXITCODE
