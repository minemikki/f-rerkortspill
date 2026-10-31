# From the local GitHub repo root:
#   powershell -ExecutionPolicy Bypass -File docs/visual-production/IMPORT_REFERENCE_IMAGES.ps1 -Archive "$env:USERPROFILE\Downloads\KJOR_VISUAL_REFERENCES.zip"
param(
  [Parameter(Mandatory = $true)][string]$Archive
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
if (-not (Test-Path -LiteralPath $Archive)) {
  throw "Reference ZIP not found: $Archive"
}
$Archive = (Resolve-Path -LiteralPath $Archive).Path

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($Archive)
try {
  $entries = @($zip.Entries | Where-Object { $_.FullName -like "docs/visual-production/references/*" -and -not $_.FullName.EndsWith("/") })
  if ($entries.Count -lt 10) { throw "Incomplete visual reference ZIP: $($entries.Count) entries." }
  foreach ($entry in $entries) {
    $relative = $entry.FullName.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $destination = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $relative))
    $expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot "docs/visual-production/references"))
    if (-not $destination.StartsWith($expectedRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Unsafe ZIP entry: $($entry.FullName)"
    }
    [System.IO.Directory]::CreateDirectory((Split-Path -Parent $destination)) | Out-Null
    $inputStream = $entry.Open()
    $outputStream = [System.IO.File]::Create($destination)
    try { $inputStream.CopyTo($outputStream) }
    finally { $outputStream.Dispose(); $inputStream.Dispose() }
    Write-Host "Imported $($entry.Name)"
  }
}
finally { $zip.Dispose() }

Write-Host "Images imported. Review git status before committing."
git -C $RepoRoot status --short
