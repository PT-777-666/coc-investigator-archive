# generate-icons.ps1 - Generates simple book/notebook-shaped PNG icons for the PWA manifest.
# Edit and re-run this script to change the icon design.
param(
  [string]$OutDir = (Join-Path $PSScriptRoot '..\icons')
)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function New-RoundedRectPath([single]$X, [single]$Y, [single]$W, [single]$H, [single]$R) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $R * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

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

  # Book cover (rounded rectangle). Kept within the ~80% safe zone for maskable icons.
  $bookX = $Size * 0.22
  $bookY = $Size * 0.20
  $bookW = $Size * 0.56
  $bookH = $Size * 0.60
  $bookR = $Size * 0.04
  $bookPath = New-RoundedRectPath -X $bookX -Y $bookY -W $bookW -H $bookH -R $bookR
  $g.DrawPath($pen, $bookPath)

  # Bookmark ribbon hanging from the top edge.
  $ribbonPenWidth = [Math]::Max(2, [int]($Size * 0.045))
  $ribbonPen = New-Object System.Drawing.Pen($accent, $ribbonPenWidth)
  $ribbonPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ribbonPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ribbonPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $ribbonX = $bookX + ($bookW * 0.66)
  $ribbonW = $Size * 0.10
  $ribbonLen = $bookH * 0.34
  $points = @(
    [System.Drawing.PointF]::new($ribbonX, $bookY)
    [System.Drawing.PointF]::new($ribbonX, $bookY + $ribbonLen)
    [System.Drawing.PointF]::new($ribbonX + ($ribbonW / 2), $bookY + $ribbonLen - ($ribbonW / 2))
    [System.Drawing.PointF]::new($ribbonX + $ribbonW, $bookY + $ribbonLen)
    [System.Drawing.PointF]::new($ribbonX + $ribbonW, $bookY)
  )
  $g.DrawLines($ribbonPen, $points)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $ribbonPen.Dispose()
  $bookPath.Dispose()
  $g.Dispose()
  $bmp.Dispose()
}

New-Icon -Size 192 -Path (Join-Path $OutDir 'icon-192.png')
New-Icon -Size 512 -Path (Join-Path $OutDir 'icon-512.png')

Write-Host "Icons generated in $OutDir"
