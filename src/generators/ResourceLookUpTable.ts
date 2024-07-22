import fs from "fs";
import path from "path";

import {
    FixedValue,
    ResourceLookUpTable,
    ResourceLookUpTableEntry,
    ResourceLookUpTablePaths,
    ResourceLookUpTablePathsElement,
} from "../@types/CustomTypes";
import { ElementDefinition, StructureDefinition } from "../@types/Types";
import { capitalize, modifyExtensionPaths, root } from "../Helper";
import { getFromCache, saveToCache } from "../cache/cacheHandler";

/**
 * An async generator function to get all StructureDefinitions from a directory
 * @param {string} dir The directory to get the StructureDefinitions from
 * @param {(file: string) => boolean} fileFilter A function to filter the files in the directory
 * @yields {StructureDefinition}
 * @returns {AsyncGenerator<StructureDefinition>} An async generator of StructureDefinitions
 */
const getAllStructureDefinitions = async function* (
    dir: string,
    fileFilter: (file: string) => boolean
): AsyncGenerator<StructureDefinition> {
    const files: string[] = await fs.promises.readdir(dir, "utf8");
    for (const file of files) {
        const filepath: string = path.join(dir, file);
        if (fileFilter(file)) {
            try {
                const data: string = await fs.promises.readFile(filepath, "utf8");
                const obj: StructureDefinition = JSON.parse(data) as StructureDefinition;
                if (obj.resourceType === "StructureDefinition") {
                    yield obj;
                }
            } catch (e: unknown) {
                if (e instanceof Error) {
                    console.error(`Error parsing JSON file "${filepath}": ${e.message}`);
                } else {
                    console.error(`Unknown error parsing JSON file "${filepath}": ${e}`);
                }
            }
        }
    }
};

/**
 * Returns async all StructureDefinitions from the KBV_PR_MIO_ULB package with their snapshots.
 * @param {string} name The name of the StructureDefinition to fetch.
 * @param {number} retries The number of retries to attempt if the fetch fails. Default is 3.
 * @returns {StructureDefinition} The StructureDefinition with the given name and its snapshot.
 */
export async function getStructureDefinitionWithSnapshot(
    name: string,
    retries: number = 3
): Promise<StructureDefinition> {
    const cacheKey: string = `structureDefinition_${name}`;
    const cachedStructureDefinition: StructureDefinition | null = await getFromCache<StructureDefinition>(cacheKey);

    if (cachedStructureDefinition?.snapshot) {
        // If cached structure definition is available and has a snapshot, return it
        console.debug(`Returning cached structure definition for ${name}`);
        return cachedStructureDefinition;
    }

    try {
        const baseResponse: Response = await fetch(`https://simplifier.net/ulb/${name}/$downloadsnapshot?format=json`);
        if (!baseResponse.ok) {
            console.error(`Error fetching snapshot for ${name}: ${baseResponse.status} ${baseResponse.statusText}`);
        }
        const structureDefinition: StructureDefinition = (await baseResponse.json()) as StructureDefinition;
        if (structureDefinition.resourceType !== "StructureDefinition" || structureDefinition.snapshot === undefined) {
            console.error(`ResourceType or snapshot is undefined for ${name}`);
        }

        // Save fetched structure definition to cache for future use
        await saveToCache(cacheKey, structureDefinition);

        return structureDefinition;
    } catch (error) {
        if (retries === 0) {
            // If no more retries left, throw the error
            console.error(`Error fetching snapshot for ${name}: ${error instanceof Error ? error.message : error}`);
            throw error;
        }

        // Log the error and recursively retry
        console.error(
            `Error fetching snapshot for ${name}. Retrying... (${retries} retries left): ${
                error instanceof Error ? error.message : error
            }`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay for 1 second
        return getStructureDefinitionWithSnapshot(name, retries - 1); // Recursively retry with reduced retries count
    }
}

/**
 * Returns all StructureDefinitions from the KBV_PR_MIO_ULB package with their snapshots.
 * If a StructureDefinition has no snapshot, it will be fetched from simplifier.
 * @yields {StructureDefinition}
 * @returns {AsyncGenerator<StructureDefinition>} - All StructureDefinitions from the KBV_PR_MIO_ULB package with their snapshots
 */
const getAllStructureDefinitionWithSnapshot = async function* (): AsyncGenerator<StructureDefinition> {
    const folder_path: string = path.join(root, "node_modules", "kbv.mio.ueberleitungsbogen");
    // Get all StructureDefinitions
    const structureDefinitions: AsyncGenerator<StructureDefinition> = getAllStructureDefinitions(
        folder_path,
        (file: string) => file.endsWith(".json") && file.startsWith("KBV_PR_MIO_ULB")
    );
    // If the StructureDefinition has a snapshot, use it, otherwise fetch it from simplifier
    for await (const structureDefinition of structureDefinitions) {
        if (structureDefinition.snapshot === undefined) {
            yield await getStructureDefinitionWithSnapshot(structureDefinition.name);
        } else {
            yield structureDefinition;
        }
    }
};

/**
 * Remove all elements from the structure definition that are not needed for the lookup table
 * @param {StructureDefinition} structureDefinition The structure definition to clean
 * @returns {Record<string, ElementDefinition>} The cleaned structure definition
 */
const cleanStructureDefinitionsPaths = (
    structureDefinition: StructureDefinition
): Record<string, ElementDefinition> => {
    if (structureDefinition.snapshot === undefined) {
        throw new Error(`Snapshot for ${structureDefinition.name} is undefined`);
    }
    const cleanedElements: ElementDefinition[] = structureDefinition.snapshot.element.filter(
        (element: ElementDefinition): boolean => {
            return !(
                element.type === undefined ||
                element.id === undefined ||
                element.id.endsWith(".id") ||
                element.id.includes(".id.") ||
                element.id.includes(".meta") ||
                (element.id.includes(".text") && !element.id.endsWith(".text")) ||
                element.type[0].code === "Narrative"
            );
        }
    );
    const transformedElements: Record<string, ElementDefinition> = {};
    const skippableElements: string[] = [];
    cleanedElements.forEach((element: ElementDefinition): void => {
        const id: string = element.id?.toString() ?? "";
        if (element.max === "0") {
            skippableElements.push(id);
        } else if (!skippableElements.some((ele: string) => id?.startsWith(ele) && !id.includes("policyRule"))) {
            transformedElements[id.toString()] = element;
        }
    });
    return transformedElements;
};

/**
 * Merges two ResourceLookUpTablePathsElement objects and returns the merged object
 * @param {ResourceLookUpTablePathsElement} obj1 The original Object which will be merged with obj2
 * @param {ResourceLookUpTablePathsElement} obj2 The new Object which will be merged with obj1
 * @returns {ResourceLookUpTablePathsElement} The merged Object
 */
const mergedElement = (
    obj1: ResourceLookUpTablePathsElement,
    obj2: ResourceLookUpTablePathsElement
): ResourceLookUpTablePathsElement => {
    const mergedObject: ResourceLookUpTablePathsElement = {
        ...obj1,
        ...obj2,
        valueSet: obj2.valueSet ?? obj1.valueSet,
        fixedValue: obj2.fixedValue ?? obj1.fixedValue,
        profileUrl: obj2.profileUrl ?? obj1.profileUrl,
        type: obj2.type ?? obj1.type,
    };

    const keysToMerge: (keyof ResourceLookUpTablePathsElement)[] = ["fixedValue", "valueSet", "profileUrl"];
    keysToMerge.forEach((key: string): void => {
        const obj1Value: string | string[] | undefined = obj1[key as keyof ResourceLookUpTablePathsElement];
        const obj2Value: string | string[] | undefined = obj2[key as keyof ResourceLookUpTablePathsElement];
        if (obj1Value !== undefined && obj2Value !== undefined) {
            const mergedArray: string[] = Array.from(
                new Set([
                    ...(Array.isArray(obj2Value) ? obj2Value : [obj2Value]),
                    ...(Array.isArray(obj1Value) ? obj1Value : [obj1Value]),
                ])
            );
            mergedObject[key.toString() as keyof ResourceLookUpTablePathsElement] =
                mergedArray.length === 1 ? mergedArray[0] : (mergedArray as string & string[]);
        }
    });

    return mergedObject;
};

/**
 * Helper function to search for fixedValues in nested codings and add them to the listFixedValuePattern
 * @param {Record<string, unknown>} obj The object to search for fixedValues
 * @param {string} path The path of the object
 * @param {Record<string, FixedValue>} listFixedValuePattern The list of fixedValues
 */
const getFixedValuesOfNestedCodings = (
    obj: Record<string, unknown>,
    path: string,
    listFixedValuePattern: Record<string, FixedValue>
): void => {
    for (const [key, value] of Object.entries(obj)) {
        const newPath: string = `${path}.${key}`;

        if (Array.isArray(value)) {
            value.forEach((val): void => {
                if (typeof val === "object") getFixedValuesOfNestedCodings(val, newPath, listFixedValuePattern);
                else listFixedValuePattern[newPath.toString()] = val;
            });
        } else {
            if (typeof value === "object")
                getFixedValuesOfNestedCodings(value as Record<string, unknown>, newPath, listFixedValuePattern);
            else listFixedValuePattern[newPath.toString()] = value as FixedValue;
        }
    }
};

/**
 * Search for Pattern information and fixed Value Information to save them in a list to give the fixed value later to other paths
 * this information have to be found recursively since they can be nested in the structure definition
 * @param {ElementDefinition} value The elements of the StructureDefinition
 * @param {Record<string, FixedValue>} listFixedValuePattern The list of all fixed values and patterns
 * @param {string} id The id of the element
 * @param {unknown} patternValue The defined Pattern of the structure definition element
 * @returns {string | undefined} The fixed value or undefined if no fixed value was found
 */
const getFixedValue = (
    value: ElementDefinition,
    listFixedValuePattern: Record<string, FixedValue>,
    id: string,
    patternValue: unknown
): string | undefined => {
    let fixedValue: string | undefined = value[
        Object.keys(value).find((key: string) => key.startsWith("fixed")) as keyof ElementDefinition
    ] as string;
    if (fixedValue !== undefined) {
        return fixedValue;
    }
    if (typeof patternValue !== "object") {
        fixedValue = patternValue as string;
    } else if (typeof patternValue === "object") {
        getFixedValuesOfNestedCodings(patternValue as Record<string, unknown>, id, listFixedValuePattern);
    }
    return fixedValue?.toString();
};

/**
 * Reformat the resource paths to the correct format: Observation.path -> StructureDefinitionName.path.
 * @param {ResourceLookUpTablePaths} resourcePaths The resource paths which should be reformatted
 * @param {string} structureDefinitionName The name of the StructureDefinition
 * @returns {ResourceLookUpTablePaths} The reformatted resource paths
 */
const reformatTheResourcePaths = (
    resourcePaths: ResourceLookUpTablePaths,
    structureDefinitionName: string
): ResourceLookUpTablePaths =>
    Object.entries(resourcePaths).reduce(
        (acc: ResourceLookUpTablePaths, [key, value]): Record<string, ResourceLookUpTablePathsElement> => {
            const updatedKey: string = key.replace(/^(\w+)/, structureDefinitionName);
            return { ...acc, [updatedKey]: value };
        },
        {} as ResourceLookUpTablePaths
    );

/**
 * The main function to transform the StructureDefinition into a ResourceLookUpTableEntry
 * Way to complex to explain it here, please read the code <3
 * @param {StructureDefinition} structureDefinition The StructureDefinition which should be transformed
 * @returns {ResourceLookUpTableEntry} The transformed StructureDefinition as ResourceLookUpTableEntry
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const getFinalResourceLookUpTableEntry = (structureDefinition: StructureDefinition): ResourceLookUpTableEntry => {
    const transformedElements: Record<string, ElementDefinition> = cleanStructureDefinitionsPaths(structureDefinition);
    const resourcePaths: ResourceLookUpTablePaths = {} as ResourceLookUpTablePaths;
    const resourceStatus: string | undefined = structureDefinition.differential?.element.find(
        (ele: ElementDefinition): boolean => ele.id === structureDefinition.type + ".text.status"
    )?.patternCode;
    const listFixedValuePattern: Record<string, FixedValue> = {};
    const patternCoding: string[] = [] as string[];

    for (const value of Object.values(transformedElements)) {
        const newId: string = modifyExtensionPaths(value.id?.toString() as string);
        const newIdEnd: string = newId.split(".")[newId.split(".").length - 1];
        const valueSetStrength: string | undefined = value.binding?.strength;
        const profileUrl: string | undefined = value.type?.[0].profile?.[0];
        const elementType: string | undefined = value.type?.[0].code;
        const patternValue: unknown =
            value[Object.keys(value).find((key: string) => key.startsWith("pattern")) as keyof ElementDefinition];
        const fixedValue: string | undefined = getFixedValue(value, listFixedValuePattern, newId, patternValue);
        if (value["patternCoding"] && Object.keys(value["patternCoding"]).length === 4) {
            patternCoding.push(newId);
        }

        const resourcePathElement: ResourceLookUpTablePathsElement = {
            type:
                (elementType && elementType.startsWith("http")
                    ? capitalize(elementType.split("/").pop()?.split(".").pop())
                    : capitalize(elementType)) + "PIO",
            valueSet:
                valueSetStrength !== "example" && value["patternCode"] === undefined
                    ? value.binding?.valueSet
                    : undefined,
            fixedValue: fixedValue ?? (listFixedValuePattern[newId.toString()] as string),
            profileUrl,
        };

        if (
            !newId.endsWith("[x]") &&
            !newId.includes("value[x]") &&
            !(newIdEnd === "extension" && profileUrl === undefined) &&
            elementType !== "BackboneElement"
        ) {
            resourcePaths[newId.toString()] =
                resourcePaths[newId.toString()] === undefined
                    ? resourcePathElement
                    : {
                          ...mergedElement(resourcePaths[newId.toString()], resourcePathElement),
                      };
        }
    }

    if (patternCoding.length > 0) {
        patternCoding.forEach((path: string): void => {
            //delete ValueSet if patternCoding is used
            const newPath: string = path.replace(/\.coding$/, "");
            delete resourcePaths[newPath.toString()].valueSet;
        });
    }

    return {
        resource: {
            status: resourceStatus,
            profile: structureDefinition.url + "|" + structureDefinition.version,
            "fhir-resource-type": structureDefinition.type,
        },
        paths: {
            ...reformatTheResourcePaths(resourcePaths, structureDefinition.name),
        },
    };
};

/**
 * Helper for adding practitioner paths to resourceLookUpTable
 * @param {ResourceLookUpTable} finalResourceLookUpTable The final resource look up table
 */
const addPractitionerPaths = (finalResourceLookUpTable: ResourceLookUpTable): void => {
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Practitioner"].paths[
        "KBV_PR_MIO_ULB_Practitioner.name:geburtsname.family.extension:namenszusatz.valueString"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Practitioner"].paths[
        "KBV_PR_MIO_ULB_Practitioner.name:geburtsname.family.extension:nachname.valueString"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Practitioner"].paths[
        "KBV_PR_MIO_ULB_Practitioner.name:geburtsname.family.extension:vorsatzwort.valueString"
    ] = { type: "StringPIO" };
};

/**
 * The main function to generate the ResourceLookUpTable.json file
 * It use async generators to iterate over all StructureDefinition with a snapshot and transform them into a ResourceLookUpTableEntry
 * @returns {ResourceLookUpTable} the generated ResourceLookUpTable
 */
export async function generateResourceLookUpTable(): Promise<ResourceLookUpTable> {
    const finalResourceLookUpTable: ResourceLookUpTable = {};

    for await (const structureDefinition of getAllStructureDefinitionWithSnapshot()) {
        finalResourceLookUpTable[structureDefinition.name.toString()] =
            getFinalResourceLookUpTableEntry(structureDefinition);
    }

    //---------- Some quick fixes which are needed for publishing project ----------
    //Replace "ExtensionPIO" with "UriPIO"
    Object.values(finalResourceLookUpTable).forEach((resource: ResourceLookUpTableEntry): void => {
        Object.entries(resource.paths).forEach(
            ([key, element]: [key: string, element: ResourceLookUpTablePathsElement]): void => {
                if (element.type === "ExtensionPIO") element.type = "UriPIO";
                if (key.endsWith(".reference")) element.type = "UuidPIO";
            }
        );
    });

    //Add missing paths for gender.extension:other-amtlich for contact persons, because it's missing on simplifier
    const contactPersonPaths: ResourceLookUpTablePaths =
        finalResourceLookUpTable["KBV_PR_MIO_ULB_RelatedPerson_Contact_Person"].paths;
    contactPersonPaths["KBV_PR_MIO_ULB_RelatedPerson_Contact_Person.gender.extension:other-amtlich.url"] = {
        type: "StringPIO",
        fixedValue: "http://fhir.de/StructureDefinition/gender-amtlich-de",
    } as ResourceLookUpTablePathsElement;
    contactPersonPaths["KBV_PR_MIO_ULB_RelatedPerson_Contact_Person.gender.extension:other-amtlich.valueCoding"] = {
        type: "CodingPIO",
        valueSet: "http://fhir.de/ValueSet/gender-other-de",
    } as ResourceLookUpTablePathsElement;
    contactPersonPaths[
        "KBV_PR_MIO_ULB_RelatedPerson_Contact_Person.gender.extension:other-amtlich.valueCoding.system"
    ] = { type: "UriPIO" } as ResourceLookUpTablePathsElement;
    contactPersonPaths[
        "KBV_PR_MIO_ULB_RelatedPerson_Contact_Person.gender.extension:other-amtlich.valueCoding.version"
    ] = { type: "StringPIO" } as ResourceLookUpTablePathsElement;
    contactPersonPaths["KBV_PR_MIO_ULB_RelatedPerson_Contact_Person.gender.extension:other-amtlich.valueCoding.code"] =
        { type: "CodePIO" } as ResourceLookUpTablePathsElement;
    contactPersonPaths[
        "KBV_PR_MIO_ULB_RelatedPerson_Contact_Person.gender.extension:other-amtlich.valueCoding.display"
    ] = { type: "StringPIO" } as ResourceLookUpTablePathsElement;

    //Add 'status' header to resources "Device" and "PatientWish" because it's missing
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Device"].resource["status"] = "extensions";
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Observation_Wish"].resource["status"] = "extensions";

    // Nursing Measures
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.url"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:codeSnomed.url"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:codeSnomed.valueCodeableConcept.coding.system"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:codeSnomed.valueCodeableConcept.coding.version"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:codeSnomed.valueCodeableConcept.coding.code"
    ] = { type: "CodePIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:codeSnomed.valueCodeableConcept.coding.display"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.url"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt.url"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt.valueTiming.code.coding"
    ] = { valueSet: "https://fhir.kbv.de/ValueSet/KBV_VS_Base_Event_Timing", type: "CodingPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt.valueTiming.code.coding.system"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt.valueTiming.code.coding.version"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt.valueTiming.code.coding.code"
    ] = { type: "CodePIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:zeitpunkt.valueTiming.code.coding.display"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:frequenz"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:frequenz.url"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:frequenz.valueTiming.repeat.periodUnit"
    ] = { valueSet: "http://hl7.org/fhir/ValueSet/units-of-time", type: "CodePIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:frequenz.valueTiming.repeat.period"
    ] = { type: "DecimalPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:frequenz.valueTiming.repeat.frequency"
    ] = { type: "UnsignedIntegerPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:dauer"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:dauer.url"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:dauer.valueQuantity.unit"
    ] = { type: "StringPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:dauer.valueQuantity.value"
    ] = { type: "DecimalPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:dauer.valueQuantity.system"
    ] = { type: "UriPIO" };
    finalResourceLookUpTable["KBV_PR_MIO_ULB_Procedure_Nursing_Measures"].paths[
        "KBV_PR_MIO_ULB_Procedure_Nursing_Measures.extension:zeitplan.extension:angabeStrukturiert.extension:dauer.valueQuantity.code"
    ] = { type: "CodePIO" };
    // Practitioner
    addPractitionerPaths(finalResourceLookUpTable);

    //Delete "KBV_PR_MIO_ULB_Identifier_PKV_KVID_10" from lookup table, because this is not a FHIR resource
    delete finalResourceLookUpTable["KBV_PR_MIO_ULB_Identifier_PKV_KVID_10"];

    return finalResourceLookUpTable;
}
