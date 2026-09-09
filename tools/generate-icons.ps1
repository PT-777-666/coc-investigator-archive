# generate-icons.ps1 - Generates simple magnifying-glass PNG icons for the PWA manifest.
# Edit and re-run this script to change the icon design.
param(
  [string]$OutDir = (Join-Path $PSScriptRoot '..\icons')
)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function New-Icon([int]$Size, [string]$Path) {
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $bg = [System.Drawing.ColorTranslator]::FromHtml('#1c1e26')
  $g.Clear($bg)

  $accent = [System.Drawing.ColorTranslator]::FromHtml('#7c9eff')
  $penWidth = [Math]::Max(3, [int]($Size * 0.07))
  $pen = New-Object System.Drawing.Pen($accent, $penWidth)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  # Magnifying-glass lens (circle). Kept within the ~80% safe zone for maskable icons.
  $lensD = [int]($Size * 0.38)
  $lensX = [int]($Size * 0.24)
  $lensY = [int]($Size * 0.24)
  $g.DrawEllipse($pen, $lensX, $lensY, $lensD, $lensD)

  # Handle (diagonal line)
  $startX = $lensX + [int]($lensD * 0.8)
  $startY = $lensY + [int]($lensD * 0.8)
  $endX = [int]($Size * 0.78)
  $endY = [int]($Size * 0.78)
  $g.DrawLine($pen, $startX, $startY, $endX, $endY)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

New-Icon -Size 192 -Path (Join-Path $OutDir 'icon-192.png')
New-Icon -Size 512 -Path (Join-Path $OutDir 'icon-512.png')

Write-Host "Icons generated in $OutDir"
