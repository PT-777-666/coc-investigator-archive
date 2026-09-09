# generate-icon-candidates.ps1 - Renders a few book-themed icon concept candidates side by side for review.
# Not part of the app itself; just a design preview tool.
param(
  [string]$OutPath = (Join-Path $PSScriptRoot '..\..\icon-candidates-preview.png')
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

$cellSize = 160
$gap = 24
$labelHeight = 34
$count = 4
$width = $cellSize * $count + $gap * ($count + 1)
$height = $cellSize + $labelHeight + $gap * 2

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$pageBg = [System.Drawing.ColorTranslator]::FromHtml('#12131a')
$g.Clear($pageBg)

$bg = [System.Drawing.ColorTranslator]::FromHtml('#1c1e26')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#7c9eff')
$labelColor = [System.Drawing.ColorTranslator]::FromHtml('#eceef2')
$font = New-Object System.Drawing.Font('Yu Gothic UI', 11)
$brush = New-Object System.Drawing.SolidBrush($labelColor)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

function Draw-CellBackground([single]$x, [single]$y, [single]$size) {
  $g.FillRectangle((New-Object System.Drawing.SolidBrush($bg)), $x, $y, $size, $size)
}

function New-Pen([single]$size, [single]$widthFactor = 0.07) {
  $penWidth = [Math]::Max(3, [single]($size * $widthFactor))
  $pen = New-Object System.Drawing.Pen($accent, $penWidth)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

# 1. Open book with bookmark (current live design)
$x0 = $gap
Draw-CellBackground $x0 $gap $cellSize
$pen = New-Pen $cellSize
$bx = $x0 + ($cellSize * 0.22); $by = $gap + ($cellSize * 0.20)
$bw = $cellSize * 0.56; $bh = $cellSize * 0.60
$bookPath = New-RoundedRectPath -X $bx -Y $by -W $bw -H $bh -R ($cellSize * 0.04)
$g.DrawPath($pen, $bookPath)
$spineX = $bx + ($bw / 2)
$g.DrawLine($pen, $spineX, $by, $spineX, $by + $bh)
$ribbonPen = New-Pen $cellSize 0.045
$ribbonX = $bx + ($bw * 0.66); $ribbonW = $cellSize * 0.10; $ribbonLen = $bh * 0.34
$pts1 = @(
  [System.Drawing.PointF]::new($ribbonX, $by)
  [System.Drawing.PointF]::new($ribbonX, $by + $ribbonLen)
  [System.Drawing.PointF]::new($ribbonX + ($ribbonW / 2), $by + $ribbonLen - ($ribbonW / 2))
  [System.Drawing.PointF]::new($ribbonX + $ribbonW, $by + $ribbonLen)
  [System.Drawing.PointF]::new($ribbonX + $ribbonW, $by)
)
$g.DrawLines($ribbonPen, $pts1)
$g.DrawString("1. Open book + ribbon (current)", $font, $brush, (New-Object System.Drawing.RectangleF($x0, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

# 2. Closed book, angled cover with a nameplate label
$x1 = $gap * 2 + $cellSize
Draw-CellBackground $x1 $gap $cellSize
$pen = New-Pen $cellSize
$bx = $x1 + ($cellSize * 0.20); $by = $gap + ($cellSize * 0.20)
$bw = $cellSize * 0.60; $bh = $cellSize * 0.60
$bookPath2 = New-RoundedRectPath -X $bx -Y $by -W $bw -H $bh -R ($cellSize * 0.04)
$g.DrawPath($pen, $bookPath2)
# spine edge near the left
$spineX2 = $bx + ($bw * 0.16)
$g.DrawLine($pen, $spineX2, $by, $spineX2, $by + $bh)
# nameplate rectangle centered on the cover
$plateW = $bw * 0.42; $plateH = $bh * 0.22
$plateX = $bx + ($bw * 0.5) - ($plateW / 2) + ($bw * 0.08)
$plateY = $by + ($bh * 0.5) - ($plateH / 2)
$g.DrawRectangle($pen, $plateX, $plateY, $plateW, $plateH)
$g.DrawString("2. Closed book + nameplate", $font, $brush, (New-Object System.Drawing.RectangleF($x1, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

# 3. Stack of two books
$x2 = $gap * 3 + $cellSize * 2
Draw-CellBackground $x2 $gap $cellSize
$pen = New-Pen $cellSize 0.06
$sbw = $cellSize * 0.58; $sbh = $cellSize * 0.22
$sb1X = $x2 + ($cellSize * 0.21); $sb1Y = $gap + ($cellSize * 0.60)
$sb2X = $x2 + ($cellSize * 0.16); $sb2Y = $gap + ($cellSize * 0.35)
$book1 = New-RoundedRectPath -X $sb1X -Y $sb1Y -W $sbw -H $sbh -R ($cellSize * 0.025)
$book2 = New-RoundedRectPath -X $sb2X -Y $sb2Y -W ($sbw * 1.05) -H $sbh -R ($cellSize * 0.025)
$g.DrawPath($pen, $book1)
$g.DrawPath($pen, $book2)
$g.DrawString("3. Stacked books", $font, $brush, (New-Object System.Drawing.RectangleF($x2, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

# 4. Open book with ruled lines (ledger / record-book look)
$x3 = $gap * 4 + $cellSize * 3
Draw-CellBackground $x3 $gap $cellSize
$pen = New-Pen $cellSize
$bx = $x3 + ($cellSize * 0.20); $by = $gap + ($cellSize * 0.22)
$bw = $cellSize * 0.60; $bh = $cellSize * 0.56
$bookPath4 = New-RoundedRectPath -X $bx -Y $by -W $bw -H $bh -R ($cellSize * 0.04)
$g.DrawPath($pen, $bookPath4)
$spineX4 = $bx + ($bw / 2)
$g.DrawLine($pen, $spineX4, $by, $spineX4, $by + $bh)
$linePen = New-Pen $cellSize 0.035
for ($i = 0; $i -lt 3; $i++) {
  $ly = $by + ($bh * (0.30 + $i * 0.20))
  $g.DrawLine($linePen, ($bx + ($bw * 0.12)), $ly, ($spineX4 - ($bw * 0.08)), $ly)
  $g.DrawLine($linePen, ($spineX4 + ($bw * 0.08)), $ly, ($bx + $bw - ($bw * 0.12)), $ly)
}
$g.DrawString("4. Ledger lines (record book)", $font, $brush, (New-Object System.Drawing.RectangleF($x3, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "Saved to $OutPath"
