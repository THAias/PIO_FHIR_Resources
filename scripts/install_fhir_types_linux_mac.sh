#!/bin/bash

# Custom Script to setup Types for FHIR R4
# This script need Net Core 7 but it will install it if not installed
# This script will clone the fhir-codegen repository and build the Types.ts file for FHIR R4 in the src folder

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if dotnet is installed

dotnet_version_7_installed=false
dotnet_7_new_install=false
generate_types=false

echo "Checking if .NET Core 7 is installed..."

if command -v dotnet >/dev/null 2>&1; then

    # Check for .NET Core 7
    dotnet_7_version=$(dotnet --list-sdks | grep -o '7\.[0-9]\+\.[0-9]\+' | head -1)
    if [[ -n $dotnet_7_version ]]; then
        echo -e "${GREEN}.NET Core 7 ($dotnet_7_version) is installed${NC}"
        dotnet_version_7_installed=true
    fi
else
    # install .NET Core 6 or .NET Core 7
    if [[ $dotnet_version_7_installed == false ]]; then
        echo -e "${YELLOW}.NET Core 7 is not installed${NC}"
        read -p "Do you want to install .NET Core 7 via script? (y/n): " install_dotnet_7
        if [[ $install_dotnet_7 == "y" ]]; then
            echo -e "${YELLOW}Installing .NET Core 7...${NC}"
            curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 7.0
            dotnet_7_new_install=true
            dotnet_version_7_installed=true
        else
            echo -e "${YELLOW}Skipping .NET Core 7 installation${NC}"
            echo -e "${RED}You need to have .NET Core 7 installed to run this script. Please install .NET Core 7 and run this script again.${NC}"
        fi
    fi

    # Set environment variables
    if [[ $dotnet_7_new_install == true ]]; then
        echo -e "${YELLOW}Setting environment variables...${NC}"
        export DOTNET_ROOT=$HOME/.dotnet
        export PATH=$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools
    fi

fi

# Check if .NET Core 7 is installed and exit if not
if [[ $dotnet_version_7_installed == false ]]; then
    echo -e "${RED}You need to have .NET Core 7 installed to run this script.${NC}"
    echo -e "${RED}Please install .NET Core 7 and run this script again.${NC}"
    exit 1
else
    folder_path="./fhir-codegen"
    git_url=https://github.com/microsoft/fhir-codegen.git

    # Clone fhir-codegen
    if [ -d "$folder_path" ] && [ -d "$folder_path/.git" ]; then
        # Check if the repository is up to date
        cd "$folder_path" || {
            echo -e "${RED}Could not change directory to $folder_path ${NC}"
            exit 1
        }
        git fetch origin
        if git status -uno | grep -q 'Your branch is up to date'; then
            echo -e "${GREEN}Repository is up to date.${NC}"
        else
            git pull origin
            echo -e "${GREEN}Repository updated.${NC}"
        fi
    else
        # Folder does not exist or is not a Git repository
        echo -e "${YELLOW}Cloning Git repository...${NC}"
        git clone "$git_url" "$folder_path"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Repository cloned successfully.${NC}"
            cd "$folder_path" || {
                echo -e "${RED}Could not change directory to $folder_path ${NC}"
                exit 1
            }
        else
            echo -e "${RED}Error cloning repository. Exiting script. ${NC}"
            exit 1
        fi
    fi

    # Build Types.ts
    project_path="src/fhir-codegen-cli/fhir-codegen-cli.csproj"
    fhir_version="latest"
    output_path="./../src/@types/Types.ts"
    type_filters="primitive|resource|complex|interaction"
    supported_resources="ValueSet|CodeSystem|StructureDefinition|ConceptMap"
    skip_code_generation=false
    overwrite_existing_file=false

    # Check if Types.ts already exists
    if [ -e "$output_path" ]; then
        read -p "The file $output_path already exists. Do you want to overwrite it? (y/n) " answer
        if [[ ! "$answer" =~ [Yy] ]]; then
            skip_code_generation=true
        else
            overwrite_existing_file=true
        fi
    fi

    if [[ $skip_code_generation == true ]]; then
        echo -e "${YELLOW}Skipping code generation.${NC}"
    else
        if [[ $overwrite_existing_file == true ]]; then
            echo -e "${YELLOW}Building Types.ts in src folder and overwriting existing file${NC}"
        else
            echo -e "${YELLOW}Types.ts didn't exist in src folder...${NC}"
            echo "Building Types.ts in src folder..."
        fi
        if command dotnet run --project "$project_path" -- --load-r4 "$fhir_version" -l TypeScript -o "$output_path" --export-types "$type_filters" -k "$supported_resources"; then
            generate_types=true
        else
            echo -e "${RED}Could not create Types.ts ${NC}"
        fi
    fi

    # Clean up
    if [[ $generate_types == true ]]; then
        echo -e "${GREEN}Types.ts successfully created${NC}"
        echo "Transform file"
        gsed -i '/^[[:space:]]*_[[:alnum:]_]*.*$/d' "$output_path"
        gsed -i -E "s/^(\s*\w+\?\:\s*[A-Za-z0-9_()'|]*\[*\]*)(\s*\|\s*undefined)(\s*;)$/\1\3/g" "$output_path"
        echo -e "${GREEN}Done${NC}"
    fi

    echo -e "${YELLOW}Cleaning up...${NC}"
    read -p "Do you want to delete the 'fhir-codegen' repository ? (y/n): " delete_fhir_codegen
    if [[ $delete_fhir_codegen == "y" ]]; then
        echo "Delete fhir-codegen repository"
        cd .. || echo "Could not change to parent directory"
        rm -rf fhir-codegen
        echo -e "${GREEN}Done${NC}"
    fi

    if [[ $dotnet_7_new_install == true ]]; then
        read -p "Do you want to uninstall the previously installed .NET Core 7 ? (y/n): " uninstall_dotnet
        if [[ $uninstall_dotnet == "y" ]]; then
            echo -e "${YELLOW}Uninstalling all .NET Core versions${NC}"
            echo -e "${YELLOW}Therefore you need sudo rights and following directories will be deleted:${NC}"
            echo "$HOME/.dotnet"
            echo "/usr/share/dotnet"
            sudo rm -rf /usr/share/dotnet
            sudo rm -rf $HOME/.dotnet
            echo -e "${GREEN}Done${NC}"
        else
            echo -e "${YELLOW}Skipping .NET Core 7 uninstallation${NC}"
        fi
    fi
fi
