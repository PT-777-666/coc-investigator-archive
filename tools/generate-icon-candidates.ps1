# generate-icon-candidates.ps1 - Renders a few icon concept candidates side by side for review.
# Not part of the app itself; just a design preview tool.
param(
  [string]$OutPath = (Join-Path $PSScriptRoot '..\..\icon-candidates-preview.png')
)

Add-Type -AssemblyName System.Drawing

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
$font = New-Object System.Drawing.Font('Yu Gothic UI', 12)
$brush = New-Object System.Drawing.SolidBrush($labelColor)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

function Draw-CellBackground([int]$x, [int]$y, [int]$size) {
  $g.FillRectangle((New-Object System.Drawing.SolidBrush($bg)), $x, $y, $size, $size)
}

function New-Pen([int]$size) {
  $penWidth = [Math]::Max(3, [int]($size * 0.07))
  $pen = New-Object System.Drawing.Pen($accent, $penWidth)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  return $pen
}

# 1. Magnifying glass (current)
$x0 = $gap
Draw-CellBackground $x0 $gap $cellSize
$pen = New-Pen $cellSize
$lensD = [int]($cellSize * 0.38)
$lensX = $x0 + [int]($cellSize * 0.24)
$lensY = $gap + [int]($cellSize * 0.24)
$g.DrawEllipse($pen, $lensX, $lensY, $lensD, $lensD)
$startX = $lensX + [int]($lensD * 0.8); $startY = $lensY + [int]($lensD * 0.8)
$endX = $x0 + [int]($cellSize * 0.78); $endY = $gap + [int]($cellSize * 0.78)
$g.DrawLine($pen, $startX, $startY, $endX, $endY)
$g.DrawString('1. Magnifying glass (current)', $font, $brush, (New-Object System.Drawing.RectangleF($x0, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

# 2. Book / journal
$x1 = $gap * 2 + $cellSize
Draw-CellBackground $x1 $gap $cellSize
$pen = New-Pen $cellSize
$bx = $x1 + [int]($cellSize * 0.22); $by = $gap + [int]($cellSize * 0.20)
$bw = [int]($cellSize * 0.56); $bh = [int]($cellSize * 0.60)
$g.DrawRectangle($pen, $bx, $by, $bw, $bh)
$g.DrawLine($pen, ($bx + [int]($bw * 0.5)), $by, ($bx + [int]($bw * 0.5)), ($by + $bh))
$g.DrawLine($pen, ($bx + [int]($bw * 0.18)), ($by + [int]($bh * 0.35)), ($bx + [int]($bw * 0.42)), ($by + [int]($bh * 0.35)))
$g.DrawLine($pen, ($bx + [int]($bw * 0.18)), ($by + [int]($bh * 0.55)), ($bx + [int]($bw * 0.42)), ($by + [int]($bh * 0.55)))
$g.DrawString('2. Book / journal', $font, $brush, (New-Object System.Drawing.RectangleF($x1, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

# 3. Tentacle curl
$x2 = $gap * 3 + $cellSize * 2
Draw-CellBackground $x2 $gap $cellSize
$pen = New-Pen $cellSize
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$cx = $x2 + $cellSize * 0.5; $cy = $gap + $cellSize * 0.55
$pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
for ($i = 0; $i -le 40; $i++) {
  $t = $i / 40.0
  $angle = $t * 6.0
  $radius = $cellSize * 0.34 * (1 - $t * 0.85)
  $px = $cx + [Math]::Cos($angle) * $radius
  $py = $cy + [Math]::Sin($angle) * $radius - ($cellSize * 0.15 * $t)
  $pts.Add((New-Object System.Drawing.PointF($px, $py)))
}
$g.DrawCurve($pen, $pts.ToArray())
$g.DrawString('3. Tentacle motif', $font, $brush, (New-Object System.Drawing.RectangleF($x2, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

# 4. Eye
$x3 = $gap * 4 + $cellSize * 3
Draw-CellBackground $x3 $gap $cellSize
$pen = New-Pen $cellSize
$ex = $x3 + [int]($cellSize * 0.16); $ey = $gap + [int]($cellSize * 0.34)
$ew = [int]($cellSize * 0.68); $eh = [int]($cellSize * 0.32)
$g.DrawArc($pen, $ex, $ey, $ew, $eh, 180, 180)
$g.DrawArc($pen, $ex, $ey, $ew, $eh, 0, 180)
$pupilD = [int]($cellSize * 0.16)
$g.DrawEllipse($pen, ($x3 + [int]($cellSize * 0.42)), ($gap + [int]($cellSize * 0.42)), $pupilD, $pupilD)
$g.DrawString('4. Watching eye', $font, $brush, (New-Object System.Drawing.RectangleF($x3, ($gap + $cellSize + 4), $cellSize, $labelHeight)), $format)

$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "Saved to $OutPath"
