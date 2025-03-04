import fs from "fs";
import path from "path";

import { PioSmallExclusions, ResourceExclusions, ResourceLookUpTable } from "../@types/CustomTypes";
import { root } from "../Helper";

/**
 * This function will modify the resource look up table by cutting out all paths, which are not included in PIO Small.
 * @param {ResourceLookUpTable} lookUpTable All paths of the PIO specification as 'ResourceLookUpTable' object
 * @returns {ResourceLookUpTable} Look up table for PIO Small
 */
export const generatePIOSmallLookUpTable = async (lookUpTable: ResourceLookUpTable): Promise<ResourceLookUpTable> => {
    /**
     * Deletes all resources from lookUpTable, where 'wholeResourceExcluded' property is true.
     * @param {PioSmallExclusions} pioSmallExclusions Data from PioSmallExclusions.json
     */
    const deleteWholeResource = (pioSmallExclusions: PioSmallExclusions): void => {
        const originalResourceCount: number = Object.keys(lookUpTable).length;
        const deletedResources: string[] = [];
        const resourcesNotFound: string[] = [];
        Object.keys(pioSmallExclusions).forEach((resourceName: string): void => {
            if (pioSmallExclusions[resourceName.toString()].wholeResourceExcluded) {
                if (Object.keys(lookUpTable).includes(resourceName)) {
                    //Delete resource from lookUpTable
                    deletedResources.push(resourceName);
                    delete lookUpTable[resourceName.toString()];
                } else {
                    //Cannot find resource to delete
                    resourcesNotFound.push(resourceName);
                }
            }
        });
        console.info(
            `\n\nDuring PioSmallLookUpTable generation ${deletedResources.length} resources out of ${originalResourceCount} were deleted`
        );
        console.info(`${resourcesNotFound.length} resources were not found and couldn't be deleted\n\n`);
    };

    /**
     * Cuts all paths from the lookUpTable, which includes the stated path to cut
     * @param {PioSmallExclusions} pioSmallExclusions Data from PioSmallExclusions.json (holds all paths to cut from lookUpTable)
     */
    const cutExcludedPaths = (pioSmallExclusions: PioSmallExclusions): void => {
        let numberOfDeletedPaths: number = 0;
        const pathsNotFound: string[] = [];
        Object.entries(pioSmallExclusions).forEach((entry: [string, ResourceExclusions]): void => {
            const resourceName: string = entry[0];
            const exclusionData: ResourceExclusions = entry[1];
            if (exclusionData && !exclusionData.wholeResourceExcluded && exclusionData.excludedPaths !== null) {
                Object.keys(exclusionData.excludedPaths).forEach((pathToDelete: string): void => {
                    //Iterate through all paths and delete all paths, which include 'pathToDelete'
                    const allPaths: string[] = Object.keys(lookUpTable[resourceName.toString()].paths);
                    const currentNumberOfDeletedPaths: number = numberOfDeletedPaths;
                    allPaths.forEach((path: string): void => {
                        if (path.includes(pathToDelete)) {
                            //Delete path from resource
                            delete lookUpTable[resourceName.toString()].paths[path.toString()];
                            numberOfDeletedPaths++;
                        }
                    });
                    if (currentNumberOfDeletedPaths === numberOfDeletedPaths) pathsNotFound.push(pathToDelete);
                });
            }
        });
        console.info(`During PioSmallLookUpTable generation ${numberOfDeletedPaths} paths were deleted`);
        console.info(`${pathsNotFound.length} paths were not found and couldn't be deleted:`);
        console.info(pathsNotFound);
        console.info("\n\n");
    };

    await fs.promises
        .readFile(path.join(root, "src", "helper", "PioSmallExclusions.json"), "utf-8")
        .then((exclusions: string): void => {
            //Parse json
            const pioSmallExclusions: PioSmallExclusions = JSON.parse(exclusions);

            //Delete resources and paths
            deleteWholeResource(pioSmallExclusions);
            cutExcludedPaths(pioSmallExclusions);
        });

    return lookUpTable;
};

export const generatePioSmallExclusionsTranslationList = async (): Promise<PioSmallExclusions> => {
    const extensionRegEx: RegExp = /(:[a-zA-Z\-_]+)/g;
    const pioSmallExclusions: PioSmallExclusions = JSON.parse(
        await fs.promises.readFile(path.join(root, "src", "helper", "PioSmallExclusions.json"), "utf-8")
    );

    //Cut all paths without translation
    Object.entries(pioSmallExclusions).forEach(([resourceName, exclusionData]: [string, ResourceExclusions]): void => {
        if (exclusionData && !exclusionData.wholeResourceExcluded && exclusionData.excludedPaths !== null) {
            Object.entries(exclusionData.excludedPaths).forEach(
                ([path, translation]: [string, string | null]): void => {
                    delete pioSmallExclusions[resourceName.toString()].excludedPaths?.[path.toString()];
                    if (translation && exclusionData.excludedPaths)
                        exclusionData.excludedPaths[path.replaceAll(extensionRegEx, "")] = translation;
                }
            );
        }
    });

    return pioSmallExclusions;
};
