param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")),
  [int]$CardWidth = 720,
  [int]$JpegQuality = 78,
  [string]$OnlyTarotDeck = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot "assets"))
$runtimeRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot "apps\mobile\assets\runtime"))
$workspaceRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)

if (-not $sourceRoot.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Source path is outside the repository: $sourceRoot"
}
if (-not $runtimeRoot.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Runtime path is outside the repository: $runtimeRoot"
}

New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

function Get-JpegCodec {
  return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Convert-ToRuntimeJpeg {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$MaxWidth,
    [int]$MaxHeight,
    [int]$Quality
  )

  $image = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $scale = [Math]::Min(1.0, [Math]::Min($MaxWidth / $image.Width, $MaxHeight / $image.Height))
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::FromArgb(21, 20, 22))
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $width, $height)
      }
      finally {
        $graphics.Dispose()
      }

      $outputDirectory = Split-Path -Parent $OutputPath
      New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
      $qualityParameter = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality,
        [long]$Quality
      )
      $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $parameters.Param[0] = $qualityParameter
      try {
        $bitmap.Save($OutputPath, (Get-JpegCodec), $parameters)
      }
      finally {
        $parameters.Dispose()
        $qualityParameter.Dispose()
      }
    }
    finally {
      $bitmap.Dispose()
    }
  }
  finally {
    $image.Dispose()
  }
}

function Convert-TreeToJpeg {
  param(
    [string]$RelativePath,
    [int]$MaxWidth,
    [int]$MaxHeight,
    [int]$Quality
  )

  $inputDirectory = Join-Path $sourceRoot $RelativePath
  if (-not (Test-Path -LiteralPath $inputDirectory)) {
    throw "Missing asset directory: $inputDirectory"
  }

  Get-ChildItem -LiteralPath $inputDirectory -File -Recurse |
    Where-Object { $_.Extension -in ".png", ".jpg", ".jpeg" } |
    ForEach-Object {
      if ($RelativePath -eq "features" -and $_.Name -like "open-reflection-*.png") { return }
    $relativeFile = [System.IO.Path]::GetRelativePath($sourceRoot, $_.FullName)
      $outputRelative = [System.IO.Path]::ChangeExtension($relativeFile, ".jpg")
      Convert-ToRuntimeJpeg `
        -InputPath $_.FullName `
        -OutputPath (Join-Path $runtimeRoot $outputRelative) `
        -MaxWidth $MaxWidth `
        -MaxHeight $MaxHeight `
        -Quality $Quality
    }
}

function Copy-RuntimeTree {
  param([string]$RelativePath)

  $inputDirectory = Join-Path $sourceRoot $RelativePath
  Get-ChildItem -LiteralPath $inputDirectory -File -Recurse | ForEach-Object {
    $relativeFile = [System.IO.Path]::GetRelativePath($sourceRoot, $_.FullName)
    $outputPath = Join-Path $runtimeRoot $relativeFile
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $outputPath -Force
  }
}

if ($OnlyTarotDeck) {
  if ($OnlyTarotDeck -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
    throw "Invalid tarot deck ID: $OnlyTarotDeck"
  }

  $deckFolder = if ($OnlyTarotDeck -eq "stellar-mosaic") { "stellar-academy" } else { $OnlyTarotDeck }
  $deckCardsRelativePath = "tarot\$deckFolder\cards"
  Convert-TreeToJpeg -RelativePath $deckCardsRelativePath -MaxWidth $CardWidth -MaxHeight 1280 -Quality $JpegQuality

  foreach ($role in @("covers", "backs")) {
    $assetName = if ($role -eq "covers" -and $OnlyTarotDeck -eq "stellar-mosaic") { "stellar-academy" } else { $OnlyTarotDeck }
    $inputPath = Join-Path $sourceRoot "tarot\deck-$role\$assetName.png"
    if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) {
      throw "Missing $OnlyTarotDeck tarot deck $role asset: $inputPath"
    }
    Convert-ToRuntimeJpeg `
      -InputPath $inputPath `
      -OutputPath (Join-Path $runtimeRoot "tarot\deck-$role\$assetName.jpg") `
      -MaxWidth $(if ($role -eq "covers") { 960 } else { 720 }) `
      -MaxHeight $(if ($role -eq "covers") { 960 } else { 1280 }) `
      -Quality 80
  }
}
else {
  $tarotDecks = Get-Content -LiteralPath (Join-Path $RepositoryRoot "packages\content\data\tarot-decks.json") -Raw | ConvertFrom-Json
  foreach ($deck in $tarotDecks) {
    $deckFolder = if ($deck.id -eq "stellar-mosaic") { "stellar-academy" } else { $deck.id }
    if ($deckFolder -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw "Invalid tarot deck ID: $($deck.id)" }
    Convert-TreeToJpeg -RelativePath "tarot\$deckFolder\cards" -MaxWidth $CardWidth -MaxHeight 1280 -Quality $JpegQuality
  }
  Convert-TreeToJpeg -RelativePath "tarot\deck-covers" -MaxWidth 960 -MaxHeight 960 -Quality 80
  Convert-TreeToJpeg -RelativePath "tarot\deck-backs" -MaxWidth 720 -MaxHeight 1280 -Quality 80
  Convert-TreeToJpeg -RelativePath "personas\thumbnails" -MaxWidth 400 -MaxHeight 500 -Quality 80
  Convert-TreeToJpeg -RelativePath "personas\covers" -MaxWidth 800 -MaxHeight 1000 -Quality 80
  Copy-RuntimeTree -RelativePath "features"
  # Brand exports are checksum-pinned and repository-owned.
  & node (Join-Path $RepositoryRoot "scripts\generate-brand-assets.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Brand asset generation failed" }
}

$runtimeFiles = Get-ChildItem -LiteralPath $runtimeRoot -File -Recurse
$runtimeBytes = ($runtimeFiles | Measure-Object -Property Length -Sum).Sum
$oversized = $runtimeFiles | Where-Object { $_.Length -gt 700KB }

if ($runtimeBytes -gt 90MB) {
  throw "Runtime assets exceed 90 MB: $([Math]::Round($runtimeBytes / 1MB, 2)) MB"
}
if ($oversized) {
  $names = ($oversized | ForEach-Object { [System.IO.Path]::GetRelativePath($runtimeRoot, $_.FullName) }) -join ", "
  throw "Runtime assets exceed 700 KB: $names"
}

Write-Output "Runtime assets: $($runtimeFiles.Count) files, $([Math]::Round($runtimeBytes / 1MB, 2)) MB"
