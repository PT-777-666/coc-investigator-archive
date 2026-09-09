# create-desktop-shortcut.ps1 - Creates a desktop shortcut that launches the app via start-app.ps1.
# Uses an English default name to avoid Windows PowerShell 5.1's encoding issues with
# non-ASCII text embedded directly in .ps1 source files (rename the .lnk afterward if desired).
#
# Note: earlier versions passed "-WindowStyle Hidden" directly on the command line, which some
# antivirus heuristics (e.g. Norton) flag as suspicious "hidden PowerShell execution" and may
# quarantine/delete the shortcut. This version instead uses the shortcut's own WindowStyle
# property (a normal, standard .lnk attribute) to start minimized, which is far less likely to
# trigger that kind of heuristic.
param(
  [string]$ShortcutName = "CoC-Investigator-Archive"
)

$AppRoot = Split-Path -Parent $PSScriptRoot
$LaunchScript = Join-Path $AppRoot "tools\start-app.ps1"
$IconPath = Join-Path $AppRoot "icons\app.ico"
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop "$ShortcutName.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$LaunchScript`""
$Shortcut.WorkingDirectory = Join-Path $AppRoot "tools"
$Shortcut.WindowStyle = 7  # 7 = minimized
if (Test-Path $IconPath) {
  $Shortcut.IconLocation = $IconPath
}
$Shortcut.Description = "Launch CoC Investigator Archive"
$Shortcut.Save()

Write-Host "Shortcut created at $ShortcutPath"
