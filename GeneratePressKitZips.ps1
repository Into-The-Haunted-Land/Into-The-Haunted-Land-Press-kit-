$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$languages = @("zh-TW", "en", "ja")
$downloadsPath = Join-Path $root "assets\downloads"

function Copy-DirectoryIfExists {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (Test-Path -LiteralPath $Source) {
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse
  }
}

function Copy-FilesIfExists {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (Test-Path -LiteralPath $Source) {
    Get-ChildItem -LiteralPath $Source -File | ForEach-Object {
      $target = Join-Path $Destination $_.Name
      if (Test-Path -LiteralPath $target) {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        $extension = $_.Extension
        $target = Join-Path $Destination "$baseName-$([guid]::NewGuid().ToString('N').Substring(0, 8))$extension"
      }

      Copy-Item -LiteralPath $_.FullName -Destination $target
    }
  }
}

New-Item -ItemType Directory -Path $downloadsPath -Force | Out-Null

foreach ($language in $languages) {
  $stage = Join-Path $env:TEMP "into-haunted-land-press-kit-$language"
  $output = Join-Path $downloadsPath "into-the-haunted-land-press-kit-$language.zip"

  if (Test-Path -LiteralPath $stage) {
    Remove-Item -LiteralPath $stage -Recurse -Force
  }

  New-Item -ItemType Directory -Path $stage -Force | Out-Null

  Copy-FilesIfExists -Source (Join-Path $root "assets\logoandkey\$language") -Destination $stage

  foreach ($folder in @("screenshots", "video")) {
    Copy-FilesIfExists -Source (Join-Path $root "assets\$folder") -Destination $stage
  }

  if (Test-Path -LiteralPath $output) {
    Remove-Item -LiteralPath $output -Force
  }

  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $output -Force
  Remove-Item -LiteralPath $stage -Recurse -Force

  Write-Host "Generated: $output"
}

Write-Host ""
Write-Host "Done. Press kit ZIP files are ready in assets\downloads."
