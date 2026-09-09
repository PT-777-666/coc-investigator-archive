# generate-icon-ico.ps1 - Generates a Windows .ico file (for the desktop shortcut icon),
# matching the same magnifying-glass design as the PWA icons.
param(
  [string]$OutPath = (Join-Path $PSScriptRoot '..\icons\app.ico')
)

Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$bg = [System.Drawing.ColorTranslator]::FromHtml('#1c1e26')
$g.Clear($bg)

$accent = [System.Drawing.ColorTranslator]::FromHtml('#7c9eff')
$penWidth = [Math]::Max(3, [int]($size * 0.07))
$pen = New-Object System.Drawing.Pen($accent, $penWidth)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$lensD = [int]($size * 0.38)
$lensX = [int]($size * 0.24)
$lensY = [int]($size * 0.24)
$g.DrawEllipse($pen, $lensX, $lensY, $lensD, $lensD)

$startX = $lensX + [int]($lensD * 0.8)
$startY = $lensY + [int]($lensD * 0.8)
$endX = [int]($size * 0.78)
$endY = [int]($size * 0.78)
$g.DrawLine($pen, $startX, $startY, $endX, $endY)

$iconHandle = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fs = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$g.Dispose()
$bmp.Dispose()

Write-Host "Icon saved to $OutPath"
