/**
 *  The Found readFileSync from package "fs" with non-literal argument at index 0 error is not relevant here, because the path is not user input.
 *  The path is a constant and is not changed by the user.
 *  See https://github.com/eslint-community/eslint-plugin-security/issues/65 for more information.
 */
import axios, { AxiosInstance, AxiosResponse } from "axios";
import rateLimit, { RateLimitedAxiosInstance } from "axios-rate-limit";
import fs from "fs";
import path from "path";

import {
    CodeSystemLookUpTableInclude,
    PreValueSetLookUpTable,
    ResourceLookUpTable,
    ResourceLookUpTableEntry,
    ValueSetLookUpTable,
    ValueSetLookUpTableCoding,
    ValueSetLookUpTableInclude,
} from "../@types/CustomTypes";
import {
    CodeSystem,
    CodeSystemConcept,
    CodeSystemConceptDesignation,
    CodeSystemConceptProperty,
    ValueSet,
    ValueSetComposeInclude,
    ValueSetComposeIncludeConcept,
    ValueSetComposeIncludeConceptDesignation,
    ValueSetComposeIncludeFilter,
    ValueSetExpansionContains,
} from "../@types/Types";
import { root } from "../Helper";
import { getFromCache, saveToCache } from "../cache/cacheHandler";

export let germanCounter: number = 0;
export let totalCounter: number = 0;

/**
 * Get all ValueSet URLs from the ResourceLookUpTable.
 * @param {ResourceLookUpTable} resourceLookUpTable - The ResourceLookUpTable.
 * @returns {Record<string, ValueSetLookUpTableInclude>} All ValueSet URLs from the ResourceLookUpTable.
 */
const getValueSetURLs = (resourceLookUpTable: ResourceLookUpTable): Record<string, ValueSetLookUpTableInclude> => {
    const valueSets: Record<string, ValueSetLookUpTableInclude> = {};
    Object.values(resourceLookUpTable).forEach((resourceLookUpTableEntry: ResourceLookUpTableEntry): void => {
        for (const path of Object.values(resourceLookUpTableEntry.paths)) {
            if (path.valueSet) {
                if (Array.isArray(path.valueSet)) {
                    for (const valueSet of path.valueSet) {
                        valueSets[valueSet.toString().split("|")[0]] = {};
                    }
                } else {
                    valueSets[path.valueSet.toString().split("|")[0]] = {};
                }
            }
        }
    });
    return valueSets;
};

/**
 * Read the json file at the given path and return it as an object.
 * @param {string} filePath The path to the json file.
 * @returns {ValueSet | CodeSystem } The json file as an object.
 */
const readJsonFromFile = (filePath: string): ValueSet | CodeSystem => {
    const jsonString: string = fs.readFileSync(filePath, "utf8");
    return JSON.parse(jsonString);
};

interface GermanConceptIDs {
    [key: string]: {
        conceptId: string;
        term: string;
        languageCode: string;
        acceptabilityMap: {
            [key: string]: string;
        };
    };
}

/**
 * Get All Values in german module and cache it with cache function
 * @returns {GermanConceptIDs | undefined} The German Concept IDs
 */
const getAllGermanConceptIds = async (): Promise<GermanConceptIDs | undefined> => {
    const cacheKey: string = "germanConceptIds";
    const cachedGermanConceptIDs: GermanConceptIDs | null = await getFromCache<GermanConceptIDs>(cacheKey);
    if (cachedGermanConceptIDs) {
        return cachedGermanConceptIDs;
    } else {
        const axiosClient: AxiosInstance = axios.create({
            baseURL: `https://browser.ihtsdotools.org/snowstorm/snomed-ct/MAIN/SNOMEDCT-DE`,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Connection: "keep-alive",
                "Accept-Language": "de",
                "User-Agent": "Care-Regio-Pio-Editor/2",
            },
        });

        axiosClient.interceptors.response.use(
            function (response: AxiosResponse) {
                return response;
            },
            function (error) {
                const res = error.response;
                console.error("Looks like there was a problem. Status Code: " + res.status);
                return Promise.reject(error);
            }
        );

        const rateLimitAxiosClient: RateLimitedAxiosInstance = rateLimit(axiosClient, {
            maxRequests: 5,
            perMilliseconds: 1000,
        });

        let itemLength: number = 0;
        let totalLength: number = 0;
        let notActiveReleased: number = 0;
        let notAccepted: number = 0;
        const items: GermanConceptIDs = {};
        const recursiveHelper = async (searchAfter?: string): Promise<void> => {
            const response = await rateLimitAxiosClient.get("/members", {
                params: {
                    limit: 10000,
                    active: true,
                    conceptActive: true,
                    lang: "de",
                    module: "11000274103",
                    groupByConcept: true,
                    type: "900000000000013009",
                    searchAfter: searchAfter,
                },
            });
            if (response.data) {
                totalLength = response.data.total;
                itemLength += response.data.items.length;
                response.data.items.forEach((item): void => {
                    if (
                        item.active &&
                        item.released &&
                        item.referencedComponent.lang === "de" &&
                        item.referencedComponent.term
                    ) {
                        if (items[item.referencedComponent.conceptId]) {
                            notAccepted++;
                            const oldElement = items[item.referencedComponent.conceptId];
                            const newElement = {
                                conceptId: item.referencedComponent.conceptId,
                                term: item.referencedComponent.term,
                                languageCode: item.referencedComponent.lang,
                                acceptabilityMap: item.referencedComponent.acceptabilityMap,
                            };
                            if (newElement.acceptabilityMap["31000274107"] === "PREFERRED") {
                                items[item.referencedComponent.conceptId] = newElement;
                            } else if (oldElement.acceptabilityMap["31000274107"] !== "PREFERRED") {
                                console.warn(
                                    `The concept ID ${newElement.conceptId} has no preferred term === ${newElement.acceptabilityMap["31000274107"]}`
                                );
                            }
                        }
                        items[item.referencedComponent.conceptId] = {
                            conceptId: item.referencedComponent.conceptId,
                            term: item.referencedComponent.term,
                            languageCode: item.referencedComponent.lang,
                            acceptabilityMap: item.referencedComponent.acceptabilityMap,
                        };
                    } else {
                        notActiveReleased++;
                    }
                });
                if (itemLength < totalLength) {
                    await recursiveHelper(response.data.searchAfter);
                }
            }
        };
        await recursiveHelper();
        console.debug(`Get ${Object.keys(items).length} individual/${totalLength} from German Concept IDs`);
        console.warn(`Not active or released: ${notActiveReleased}/${totalLength}`);
        console.warn(`Not accepted: ${notAccepted}/${totalLength}`);
        console.warn(
            `In total ${notAccepted + notActiveReleased + Object.keys(items).length}/${totalLength} are processed`
        );
        await saveToCache(cacheKey, items);
        return items;
    }
};

/**
 * Check if the german concept id exists and return the term
 * @param {GermanConceptIDs} germanConceptIds The German Concept IDs
 * @param {string} conceptId The concept ID
 * @returns {string | undefined} The term of the concept ID
 */
const checkIfGermanConceptIdExists = (
    germanConceptIds: GermanConceptIDs | undefined,
    conceptId: string
): string | undefined => {
    if (germanConceptIds && germanConceptIds[conceptId as string]) {
        germanCounter++;
        return germanConceptIds[conceptId as string].term;
    }
};

/**
 * Extracts the information from the given ValueSet and returns them as an object.
 * @param {string} url The url of the ValueSet.
 * @param {Record<string, string>} valueSetPaths All ValueSet paths from the FHIR resources.
 * @param {GermanConceptIDs | undefined} germanConceptIds The German Concept IDs.
 * @returns {ValueSetLookUpTableInclude} The ValueSet information as an object.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const extractValueSetInformation = async (
    url: string,
    valueSetPaths: Record<string, string>,
    germanConceptIds: GermanConceptIDs | undefined
): Promise<ValueSetLookUpTableInclude> => {
    const path: string = valueSetPaths[url.toString()];
    const valueSet: ValueSet = readJsonFromFile(path) as ValueSet;
    const tempObj: ValueSetLookUpTableInclude = {
        include: valueSet.compose?.include as ValueSetComposeInclude[],
    };
    tempObj.include?.forEach((includeObj: ValueSetComposeInclude) => {
        if ("concept" in includeObj && "system" in includeObj) {
            includeObj.concept = includeObj.concept?.map((conceptObj: ValueSetComposeIncludeConcept) => {
                totalCounter++;
                const germanTranslation: ValueSetComposeIncludeConceptDesignation | undefined =
                    conceptObj.designation?.find(
                        (translation: ValueSetComposeIncludeConceptDesignation): boolean =>
                            translation.language === "de"
                    );

                const germanTranslationTerm: string | undefined = checkIfGermanConceptIdExists(
                    germanConceptIds,
                    conceptObj.code
                );
                return {
                    code: conceptObj.code,
                    display: germanTranslation?.value ?? germanTranslationTerm ?? conceptObj.display,
                    system: includeObj.system ?? valueSet.url,
                    version: includeObj.version ?? valueSet.version,
                    germanDisplay: germanTranslation?.value ?? germanTranslationTerm,
                };
            });
        } else if (includeObj.valueSet !== undefined) {
            const valueSetUrl: string | string[] =
                includeObj.valueSet.length > 1 ? includeObj.valueSet : includeObj.valueSet[0];
            if (typeof valueSetUrl === "string") {
                extractValueSetInformation(valueSetUrl, valueSetPaths, germanConceptIds).then(
                    (valueSetData: ValueSetLookUpTableInclude) => {
                        delete includeObj.valueSet;
                        valueSetData.include?.forEach((valueSetIncludeObj: ValueSetComposeInclude) => {
                            includeObj.system = valueSetIncludeObj.system;
                        });
                    }
                );
            }
        }
        return includeObj;
    });
    const ValueSetExpansion: ValueSetExpansionContains[] | undefined = valueSet.expansion?.contains?.map(
        (containsObj: ValueSetExpansionContains) => {
            const germanTranslation: ValueSetComposeIncludeConceptDesignation | undefined =
                containsObj.designation?.find(
                    (translation: ValueSetComposeIncludeConceptDesignation): boolean => translation.language === "de"
                );
            containsObj.display = germanTranslation?.value ?? containsObj.display;
            return containsObj;
        }
    );
    if (valueSet.expansion?.total !== undefined && valueSet.expansion?.offset !== undefined) {
        tempObj.expansion = ValueSetExpansion?.slice(valueSet.expansion.offset, valueSet.expansion.total);
    }
    return tempObj;
};

/**
 * Extracts the information from the CodeSystem at the given url and returns it as an object.
 * @param {string} url - The url of the CodeSystem.
 * @param {Record<string, string>} codeSystemPaths - All CodeSystem paths from all FHIR resources.
 * @param {ValueSetComposeIncludeFilter[]} filter - The filter to apply to the CodeSystem.
 * @returns {CodeSystemLookUpTableInclude} The CodeSystem information as an object.
 */
const extractCodeSystemInformation = (
    url: string,
    codeSystemPaths: Record<string, string>,
    filter?: ValueSetComposeIncludeFilter[]
    // eslint-disable-next-line sonarjs/cognitive-complexity
): CodeSystemLookUpTableInclude => {
    const path: string | undefined = codeSystemPaths[url.toString()];
    if (path === undefined) {
        return {};
    }
    const codeSystem: CodeSystem = readJsonFromFile(path) as CodeSystem;

    const codeSystemConcept: CodeSystemConcept[] = [];

    if (filter !== undefined) {
        filter.forEach((filterObj: ValueSetComposeIncludeFilter): void => {
            let searchedConcept: CodeSystemConcept | undefined;
            if (filterObj.op === "is-a") {
                // find the concept with the given code with match with the filter value search also in nested concepts
                codeSystem.concept?.forEach((conceptObj: CodeSystemConcept): void => {
                    const nestedConceptSearch = (concept: CodeSystemConcept[]): void => {
                        concept.forEach((nestedConceptObj: CodeSystemConcept): void => {
                            if (nestedConceptObj.code === filterObj.value) {
                                searchedConcept = nestedConceptObj;
                            } else if (nestedConceptObj.concept) {
                                nestedConceptSearch(nestedConceptObj.concept);
                            }
                        });
                    };
                    if (conceptObj.code === filterObj.value) {
                        searchedConcept = conceptObj;
                    } else if (conceptObj.concept) {
                        nestedConceptSearch(conceptObj.concept);
                    }
                });
                if (searchedConcept !== undefined) {
                    codeSystem.concept = searchedConcept.concept;
                }
            } else {
                console.warn("Filter operation not supported");
                console.debug(filterObj);
            }
        });
    }

    codeSystem.concept?.forEach((conceptObj: CodeSystemConcept): void => {
        if (conceptObj.property !== undefined) {
            const dep: CodeSystemConceptProperty | undefined = conceptObj.property.find(
                (propertyObj: CodeSystemConceptProperty): boolean => propertyObj.valueCode === "deprecated"
            );
            if (dep !== undefined) {
                return;
            }
        }
        const germanTranslation: CodeSystemConceptDesignation | undefined = conceptObj.designation?.find(
            (translation: CodeSystemConceptDesignation): boolean => translation.language === "de"
        );
        conceptObj.display = germanTranslation?.value ?? conceptObj.display;
        codeSystemConcept.push(conceptObj);

        /**
         * Helper function to get all nested codes from the CodeSystem
         * @param {CodeSystemConcept[]} nestedConceptObjs - The CodeSystemConcept array to get the nested codes from
         */
        const extractNestedInformation = (nestedConceptObjs: CodeSystemConcept[]): void => {
            nestedConceptObjs.forEach((nestedConceptObj: CodeSystemConcept) => {
                if (nestedConceptObj.property !== undefined) {
                    const dep: CodeSystemConceptProperty | undefined = nestedConceptObj.property.find(
                        (propertyObj: CodeSystemConceptProperty): boolean => propertyObj.valueCode === "deprecated"
                    );
                    if (dep !== undefined) {
                        return {} as CodeSystemConcept;
                    }
                }
                const germanTranslation: CodeSystemConceptDesignation | undefined = nestedConceptObj.designation?.find(
                    (translation: CodeSystemConceptDesignation): boolean => translation.language === "de"
                );
                nestedConceptObj.display = germanTranslation?.value ?? nestedConceptObj.display;
                codeSystemConcept.push(nestedConceptObj);
            });
        };
        if (conceptObj.concept) {
            extractNestedInformation(conceptObj.concept);
        }
    });

    return {
        system: codeSystem.url ?? codeSystem.identifier?.[0].system,
        version: codeSystem.version,
        concept: codeSystemConcept,
    };
};

/**
 * Add the ValueSetInformation to the ValueSetLookUpTable.
 * @param {Record<string, ValueSetLookUpTableInclude>} valueSetURLs All the needed ValueSetURLs.
 * @param {Record<string, string>} valueSetPaths All ValueSet of the FHIR packages.
 * @returns {PreValueSetLookUpTable} The ValueSetLookUpTable with the ValueSetInformation.
 */
const addValueSetsToLookUpTable = async (
    valueSetURLs: Record<string, ValueSetLookUpTableInclude>,
    valueSetPaths: Record<string, string>
): Promise<PreValueSetLookUpTable> => {
    const germanConceptIds: GermanConceptIDs | undefined = await getAllGermanConceptIds();
    for (const key of Object.keys(valueSetURLs)) {
        valueSetURLs[key.toString()] = await extractValueSetInformation(key, valueSetPaths, germanConceptIds);
    }
    return valueSetURLs as PreValueSetLookUpTable;
};

/**
 * Transform the CodeSystems to the ValueSetLookUpTable format with all nested codes.
 * @param {CodeSystemLookUpTableInclude} codeSystem The CodeSystem to transform.
 * @returns {ValueSetLookUpTableCoding[]} The CodeSystem as ValueSetLookUpTable.
 */
const mapConcepts = (codeSystem: CodeSystemLookUpTableInclude): ValueSetLookUpTableCoding[] => {
    const concepts: ValueSetLookUpTableCoding[] = [] as ValueSetLookUpTableCoding[];
    codeSystem.concept?.forEach((conceptObj: CodeSystemConcept) => {
        /**
         * Helper function to get all nested codes from the CodeSystem
         * @param {CodeSystemConcept[]} cp - The CodeSystemConcept array to get the nested codes from
         */
        function nestedCodes(cp: CodeSystemConcept[]): void {
            cp.forEach((c: CodeSystemConcept): void => {
                const germanTranslation: CodeSystemConceptDesignation | undefined = c.designation?.find(
                    (translation: CodeSystemConceptDesignation): boolean => translation.language === "de"
                );
                concepts.push({
                    code: c.code,
                    display: germanTranslation?.value ?? c.display,
                    system: codeSystem.system,
                    version: codeSystem.version,
                });
                if (c.concept) {
                    nestedCodes(c.concept);
                }
            });
        }

        const germanTranslation: CodeSystemConceptDesignation | undefined = conceptObj.designation?.find(
            (translation: CodeSystemConceptDesignation): boolean => translation.language === "de"
        );

        concepts.push({
            code: conceptObj.code,
            display: germanTranslation?.value ?? conceptObj.display,
            system: codeSystem.system,
            version: codeSystem.version,
        });
        if (conceptObj.concept) {
            nestedCodes(conceptObj.concept);
        }
    });
    return concepts;
};

/**
 * Combines the CodeSystem information with the ValueSet information
 * @param {PreValueSetLookUpTable} valueSetsLookUpTable - The ValueSets look up table with the ValueSet information which were generated in the previous step
 * @param {Record<string, string>} codeSystemPaths - The paths to all CodeSystems
 * @returns {PreValueSetLookUpTable} The ValueSets look up table with the CodeSystem information
 */
const combineCodeSystemsWithValueSets = (
    valueSetsLookUpTable: PreValueSetLookUpTable,
    codeSystemPaths: Record<string, string>
): PreValueSetLookUpTable => {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    Object.values(valueSetsLookUpTable).forEach((entries: { include: ValueSetLookUpTableInclude[] }): void => {
        entries.include.forEach((includeObj: ValueSetLookUpTableInclude): void => {
            if (includeObj.system && !includeObj.system.includes("://snomed.info/sct")) {
                const system: string =
                    includeObj.system === "http://ihe.net/fhir/ValueSet/IHE.FormatCode.codesystem"
                        ? "http://ihe.net/fhir/ihe.formatcode.fhir/CodeSystem/formatcode"
                        : includeObj.system;
                const filter: ValueSetComposeIncludeFilter[] | undefined = includeObj.filter;
                const codeSystem: CodeSystemLookUpTableInclude | undefined = extractCodeSystemInformation(
                    system,
                    codeSystemPaths,
                    filter
                );

                if (codeSystem !== undefined && codeSystem.concept != null) {
                    if (includeObj.concept !== undefined) {
                        const codeSystemConcept: (CodeSystemConcept | undefined)[] = includeObj.concept?.map(
                            (includeObjConcept: ValueSetLookUpTableCoding) => {
                                const foundConcept: CodeSystemConcept | undefined = codeSystem.concept?.find(
                                    (codeSystemConcept: CodeSystemConcept): boolean =>
                                        codeSystemConcept.code === includeObjConcept.code
                                );
                                if (foundConcept) delete foundConcept.concept;
                                return foundConcept;
                            }
                        );
                        codeSystem.concept = codeSystemConcept?.filter(
                            (conceptEntry: CodeSystemConcept | undefined): boolean => conceptEntry !== undefined
                        ) as CodeSystemConcept[];
                    }
                    includeObj.concept = mapConcepts(codeSystem);
                }
            }
        });
    });
    return valueSetsLookUpTable;
};

/**
 * Helper function of the reformatCombinedValueSetsLookUpTableExpansion function to reformat expansion objects
 * @param {ValueSetExpansionContains[] | undefined} expansion The expansion object to reformat
 * @param {Map<string, ValueSetLookUpTableCoding>} uniqueObjects The Map of unique objects in the ValueSet
 */
const reformatCombinedValueSetsLookUpTableExpansion = (
    expansion: ValueSetExpansionContains[] | undefined,
    uniqueObjects: Map<string, ValueSetLookUpTableCoding>
): void => {
    if (expansion != null) {
        for (const expansionObj of expansion) {
            if (expansionObj.code != null) {
                const existingObj: ValueSetLookUpTableCoding | undefined = uniqueObjects.get(expansionObj.code);
                if (existingObj == null) {
                    uniqueObjects.set(expansionObj.code, expansionObj);
                }
            }
        }
    }
};

/**
 * Reformat the combined ValueSets and the CodeSystem to a list of nested codings with the valueSet URL as Key
 * @param {PreValueSetLookUpTable} combinedValueSetsToLookUpTable combined ValueSets and the CodeSystem Object from the combineCodeSystemsWithValueSets function
 * @returns {Record<string, ValueSetLookUpTableCoding[]>} The reformatted ValueSets and CodeSystem Object
 */
const reformatCombinedValueSetsToLookUpTable = (
    combinedValueSetsToLookUpTable: PreValueSetLookUpTable
    // eslint-disable-next-line sonarjs/cognitive-complexity
): Record<string, ValueSetLookUpTableCoding[]> => {
    const reformattedLookUpTable: Record<string, ValueSetLookUpTableCoding[]> = {};
    for (const [key, { include, expansion }] of Object.entries(combinedValueSetsToLookUpTable)) {
        const uniqueObjects: Map<string, ValueSetLookUpTableCoding> = new Map<string, ValueSetLookUpTableCoding>();
        for (const includeObj of include) {
            const codings: ValueSetLookUpTableCoding[] | undefined = includeObj.concept;
            if (codings != null) {
                for (const coding of codings) {
                    coding.code && uniqueObjects.set(coding.code, coding);
                }
            }
        }
        reformatCombinedValueSetsLookUpTableExpansion(expansion, uniqueObjects);
        reformattedLookUpTable[key.toString()] = Array.from(uniqueObjects.values());
    }
    return reformattedLookUpTable;
};

/**
 * This function returns all value sets and code systems of the fhir resources
 * @returns {Promise<{valueSetPaths: Record<string, string>, codeSystemPaths: Record<string, string>}>} The paths to all value sets and code systems
 */
const findAllValueSetsInLookUpTable = async (): Promise<{
    valueSetPaths: Record<string, string>;
    codeSystemPaths: Record<string, string>;
}> => {
    const folders: string[] = [
        "hl7.fhir.r4.core",
        "de.basisprofil.r4",
        "kbv.basis",
        "kbv.mio.ueberleitungsbogen",
        "KBV_SFHIR",
        "ihe.formatcode.fhir",
    ];
    const valueSetPaths: Record<string, string> = {};
    const codeSystemPaths: Record<string, string> = {};
    for (const folder of folders) {
        const folderPath: string =
            folder === "KBV_SFHIR" ? path.join(root, folder) : path.join(root, "node_modules", folder);
        const jsonFiles: string[] = (await fs.promises.readdir(folderPath)).filter(
            (fileName: string): boolean => path.extname(fileName) === ".json"
        );
        for (const jsonFile of jsonFiles) {
            const absolutePath: string = path.join(folderPath, jsonFile);
            const fileContent: string = await fs.promises.readFile(absolutePath, "utf8");
            const fileContentJson: ValueSet | CodeSystem = JSON.parse(fileContent);
            if (fileContentJson.resourceType === "ValueSet") {
                valueSetPaths[fileContentJson.url as string] = absolutePath;
            } else if (fileContentJson.resourceType === "CodeSystem") {
                codeSystemPaths[fileContentJson.url as string] = absolutePath;
            }
        }
    }
    return { valueSetPaths, codeSystemPaths };
};

/**
 * This function generates the ValueSet look up table and return it as a JSON file
 * @param {ResourceLookUpTable} lookUpTable The Resource look up table
 * @returns {Promise<ValueSetLookUpTable>} The ValueSet look up table
 */
export const generateValueSetLookUpTable = async (lookUpTable: ResourceLookUpTable): Promise<ValueSetLookUpTable> => {
    const valueSetURLs: Record<string, ValueSetLookUpTableInclude> = getValueSetURLs(lookUpTable);
    const {
        codeSystemPaths,
        valueSetPaths,
    }: {
        valueSetPaths: Record<string, string>;
        codeSystemPaths: Record<string, string>;
    } = await findAllValueSetsInLookUpTable();

    const valueSetsToLookUpTable: PreValueSetLookUpTable = await addValueSetsToLookUpTable(valueSetURLs, valueSetPaths);
    const combinedValueSetsToLookUpTable: PreValueSetLookUpTable = combineCodeSystemsWithValueSets(
        valueSetsToLookUpTable,
        codeSystemPaths
    );
    console.info(`There should be ${germanCounter} german translations in ${totalCounter} Codes`);
    return reformatCombinedValueSetsToLookUpTable(combinedValueSetsToLookUpTable);
};
