# generate-icon-ico.ps1 - Generates a Windows .ico file (for the desktop shortcut icon),
# matching the same book/notebook design as the PWA icons.
param(
  [string]$OutPath = (Join-Path $PSScriptRoot '..\icons\app.ico')
)

Add-Type -AssemblyName System.Drawing

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

$bookX = $size * 0.22
$bookY = $size * 0.20
$bookW = $size * 0.56
$bookH = $size * 0.60
$bookR = $size * 0.04
$bookPath = New-RoundedRectPath -X $bookX -Y $bookY -W $bookW -H $bookH -R $bookR
$g.DrawPath($pen, $bookPath)

$spineX = $bookX + ($bookW / 2)
$g.DrawLine($pen, $spineX, $bookY, $spineX, $bookY + $bookH)

$ribbonPenWidth = [Math]::Max(2, [int]($size * 0.045))
$ribbonPen = New-Object System.Drawing.Pen($accent, $ribbonPenWidth)
$ribbonPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$ribbonPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$ribbonPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$ribbonX = $bookX + ($bookW * 0.66)
$ribbonW = $size * 0.10
$ribbonLen = $bookH * 0.34
$points = @(
  [System.Drawing.PointF]::new($ribbonX, $bookY)
  [System.Drawing.PointF]::new($ribbonX, $bookY + $ribbonLen)
  [System.Drawing.PointF]::new($ribbonX + ($ribbonW / 2), $bookY + $ribbonLen - ($ribbonW / 2))
  [System.Drawing.PointF]::new($ribbonX + $ribbonW, $bookY + $ribbonLen)
  [System.Drawing.PointF]::new($ribbonX + $ribbonW, $bookY)
)
$g.DrawLines($ribbonPen, $points)

$iconHandle = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fs = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$ribbonPen.Dispose()
$bookPath.Dispose()
$g.Dispose()
$bmp.Dispose()

Write-Host "Icon saved to $OutPath"
