# Сборка и запуск (перед build останавливает старый процесс)
& "$PSScriptRoot\build.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dotnet run --no-build @args
