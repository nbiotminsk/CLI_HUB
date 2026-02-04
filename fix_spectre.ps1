$files = Get-ChildItem -Path 'C:\Users\Admin\Desktop\CLI_HUB\node_modules\node-pty' -Recurse -Filter '*.vcxproj'
foreach($file in $files) {
    $content = Get-Content $file.FullName
    $newContent = $content -replace '<SpectreMitigation>Spectre</SpectreMitigation>', '<SpectreMitigation>false</SpectreMitigation>'
    Set-Content -Path $file.FullName -Value $newContent
    Write-Host "Fixed: $($file.FullName)"
}
