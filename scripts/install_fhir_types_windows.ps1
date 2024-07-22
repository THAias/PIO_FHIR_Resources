# Custom Script to setup Types for FHIR R4
# This script needs .NET Core 7 but it will install it if not installed
# This script will clone the fhir-codegen repository and build the Types.ts file for FHIR R4 in the src folder
$ErrorActionPreference = "Stop"

$GREEN = [ConsoleColor]::Green
$RED = [ConsoleColor]::Red
$YELLOW = [ConsoleColor]::Yellow
$NC = [ConsoleColor]::Black

# Check if dotnet is installed
$dotnet_version_7_installed = $false
$dotnet_7_new_install = $false
$generate_types = $false

Write-Host "Checking if .NET Core 7 is installed..."

if (Get-Command dotnet -ErrorAction SilentlyContinue)
{
    # Check for .NET Core 7
    $dotnet_7_version = dotnet --list-sdks | Select-String -Pattern '7\.[0-9]+\.[0-9]+' | Select-Object -First 1 -ExpandProperty Matches | Select-Object -First 1 -ExpandProperty Value
    if (-not [string]::IsNullOrEmpty($dotnet_7_version))
    {
        Write-Host -ForegroundColor $GREEN ".NET Core 7 ($dotnet_7_version) is installed"
        $dotnet_version_7_installed = $true
    }
}
if ($dotnet_version_7_installed -eq $false)
{
    Write-Host -ForegroundColor $YELLOW ".NET Core 7 is not installed"
    $install_dotnet_7 = Read-Host "Do you want to install .NET Core 7 via script? (y/n)"
    if ($install_dotnet_7 -eq "y")
    {
        Write-Host -ForegroundColor $YELLOW "Installing .NET Core 7..."
        &powershell -NoProfile -ExecutionPolicy unrestricted -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; &([scriptblock]::Create((Invoke-WebRequest -UseBasicParsing 'https://dot.net/v1/dotnet-install.ps1'))) -Channel 7.0"
        $dotnet_7_new_install = $true
        $dotnet_version_7_installed = $true
    }
    else
    {
        Write-Host -ForegroundColor $YELLOW "Skipping .NET Core 7 installation"
    }
}

# Set environment variables
if ($dotnet_7_new_install -eq $true)
{
    Write-Host -ForegroundColor $YELLOW "Setting environment variables..."
    $env:DOTNET_ROOT = "$HOME\.dotnet"
    $env:PATH += ";$env:DOTNET_ROOT;$env:DOTNET_ROOT\tools"
}
# Check if .NET Core 7 is installed and exit if not
if (-not(Get-Command dotnet.exe -ErrorAction SilentlyContinue))
{
    Write-Host -ForegroundColor $RED "You need to have .NET Core 7 installed to run this script."
    Write-Host -ForegroundColor $RED "Please install .NET Core 7 and run this script again."
    exit 1
}
else
{
    $output = dotnet --version
    if ($output -match '7\..*\..*' -and $dotnet_verion_new_install -eq $true)
    {
        Write-Host -ForegroundColor $GREEN ".NET Core 7 succesfully is installed"
    }
}

if ($dotnet_version_7_installed -eq $true)
{
    $folder_path = ".\fhir-codegen"
    $git_url = "https://github.com/microsoft/fhir-codegen.git"

    # Clone fhir-codegen
    if ((Test-Path $folder_path) -and (Test-Path "$folder_path\.git"))
    {
        # Check if the repository is up to date
        Set-Location $folder_path
        git fetch origin
        if (git status -uno | Select-String "Your branch is up to date")
        {
            Write-Host -ForegroundColor $GREEN "Repository is up to date."
        }
        else
        {
            git pull origin
            Write-Host -ForegroundColor $GREEN "Repository updated."
        }
    }
    else
    {
        # Folder does not exist or is not a Git repository
        Write-Host -ForegroundColor $YELLOW "Cloning Git repository..."
        git clone $git_url $folder_path
        if ($?)
        {
            Write-Host -ForegroundColor $GREEN "Repository cloned successfully."
            Set-Location $folder_path
        }
        else
        {
            Write-Host -ForegroundColor $RED "Error cloning repository. Exiting script."
            exit 1
        }
    }
    # Build Types.ts
    $project_path = "src/fhir-codegen-cli/fhir-codegen-cli.csproj"
    $fhir_version = "latest"
    $output_path = "./../../src/@types/Types.ts"
    $type_filters = "primitive|resource|complex|interaction"
    $supported_resources = "ValueSet|CodeSystem|StructureDefinition|ConceptMap"
    $skip_code_generation = $false
    $overwrite_existing_file = $false

    # Check if Types.ts already exists
    if (Test-Path $output_path)
    {
        $answer = Read-Host "The file $output_path already exists. Do you want to overwrite it? (y/n)"
        if ($answer -notmatch "[Yy]")
        {
            $skip_code_generation = $true
        }
        else
        {
            $overwrite_existing_file = $true
        }
    }

    if ($skip_code_generation -eq $false)
    {
        if ($overwrite_existing_file -eq $true)
        {
            Write-Host "Building Types.ts in src folder and overwriting existing file" -ForegroundColor $YELLOW
        }
        else
        {
            Write-Host "Types.ts didn't exist in src folder..." -ForegroundColor $YELLOW
            Write-Host "Building Types.ts in src folder..." -ForegroundColor $YELLOW
        }
        if (dotnet run --project $project_path -- --load-r4 $fhir_version -l TypeScript -o $output_path --export-types $type_filters -k $supported_resources)
        {
            $generate_types = $true
        }
        else
        {
            Write-Host "Could not create Types.ts" -ForegroundColor $RED
        }
    }
    if ($generate_types -eq $true)
    {
        Write-Host "Types.ts successfully created" -ForegroundColor $GREEN
        Write-Host "Transform file" -ForegroundColor $GREEN
        Get-Content $output_path | Foreach-Object { $_ -replace '^[\s]*_[\w_?:]*.*', '' } | Set-Content "./../../src/@types/TypesNew1.ts"
        Get-Content "./../../src/@types/TypesNew1.ts" | Foreach-Object { $_ -replace '^(\s*\w+\?\:\s*[A-Za-z0-9_()''|]*\[*\]*)(\s*\|\s*undefined)(\s*;)$', '$1$3' } | Set-Content $output_path
        Remove-Item "./../../src/@types/TypesNew1.ts"
        (Get-Content $output_path | Where-Object { $_ -notmatch "^$" }) | Set-Content $output_path
        Invoke-Expression eslint --fix $output_path
        Invoke-Expression prettier --write $output_path
        Write-Host "Done" -ForegroundColor $GREEN
    }

    Write-Host "Cleaning up..." -ForegroundColor $YELLOW
    $delete_fhir_codegen = Read-Host "Do you want to delete the 'fhir-codegen' repository ? (y/n): "
    if ($delete_fhir_codegen -eq "y")
    {
        Write-Host "Delete fhir-codegen repository"
        Set-Location ".."
        Remove-Item -Recurse -Force fhir-codegen
        Write-Host "Done" -ForegroundColor $GREEN
    }
}