import { GermanTranslationsLookUpTable } from "../@types/CustomTypes";
import { ConceptMap, ConceptMapGroup, ConceptMapGroupElement } from "../@types/Types";
import { getFromCache, saveToCache } from "../cache/cacheHandler";

/**
 * This function takes a url and returns a ConceptMap object
 * If the ConceptMap is not cached, it will be fetched from the url and cached
 * @param {string[]} urls The urls of the ConceptMaps to fetch
 * @returns {Promise<ConceptMap | undefined>[]} A Promise of a ConceptMap objects array
 */
export const getConceptMaps = (urls: string[]): Promise<ConceptMap | undefined>[] => {
    return urls.map(async (url: string): Promise<ConceptMap | undefined> => {
        const name: string = url.split("/")[url.split("/").length - 2];
        const cacheKey: string = `conceptMap_${name}`;
        const cachedConceptMap: ConceptMap | null = await getFromCache<ConceptMap>(cacheKey);
        if (cachedConceptMap && cachedConceptMap.resourceType === "ConceptMap") {
            return cachedConceptMap;
        } else {
            try {
                const baseResponse: Response = await fetch(url);
                if (!baseResponse || !baseResponse.ok) {
                    const errorMessage: string = baseResponse
                        ? `Error fetching ConceptMap for ${name}: ${baseResponse.status} ${baseResponse.statusText}`
                        : `Error fetching ConceptMap for ${name}: Response is undefined`;
                    console.error(errorMessage);
                    return;
                }
                const conceptMap: ConceptMap = (await baseResponse.json()) as ConceptMap;
                if (conceptMap && conceptMap.resourceType === "ConceptMap") {
                    await saveToCache<ConceptMap>(cacheKey, conceptMap);
                    return conceptMap;
                }
            } catch (error) {
                console.error(error);
            }
        }
    });
};

/**
 * Helper function to transform an Array of objects into a object
 * @param {{ [key: string]: { [key: string]: string }[] }[]} objArray The Object list to transform
 * @returns {GermanTranslationsLookUpTable} The transformed object
 */
const transformObject = (objArray: { [key: string]: { [key: string]: string }[] }[]): GermanTranslationsLookUpTable => {
    const transformedObj: { [key: string]: { [key: string]: string } } = {};

    for (const obj of objArray) {
        for (const key in obj) {
            if (!transformedObj[key.toString()]) {
                transformedObj[key.toString()] = {};
            }

            for (const item of obj[key.toString()]) {
                for (const innerKey in item) {
                    transformedObj[key.toString()][innerKey.toString()] = item[innerKey.toString()];
                }
            }
        }
    }

    return transformedObj;
};

export const mergeGermanTranslation = async (): Promise<GermanTranslationsLookUpTable> => {
    const combinedData: GermanTranslationsLookUpTable = {};
    const resolveData: Awaited<ConceptMap | undefined>[] = await Promise.all(
        getConceptMaps([
            "https://simplifier.net/base1x0/kbv-cm-base-terminology-complete-german/$download?format=json",
            "https://simplifier.net/ulb/kbv-cm-mio-ulb-overview/$download?format=json",
            "https://simplifier.net/basisprofil-de-r4/conceptmap-ops-snomed-category-mapping/$download?format=json",
        ])
    );
    const data: { [p: string]: { [p: string]: string } }[] = resolveData.map(
        (
            data: ConceptMap | undefined
        ): {
            [p: string]: { [p: string]: string };
        } => {
            if (!data || !data.group) return {};
            const generatedData: { [key: string]: { [key: string]: string }[] }[] = data.group.map(
                (
                    group: ConceptMapGroup
                ): {
                    [key: string]: { [key: string]: string }[];
                } => {
                    const elements: { [p: string]: string }[] = group.element.map(
                        (
                            element: ConceptMapGroupElement
                        ): {
                            [key: string]: string;
                        } => {
                            return {
                                [element.code as string]: element.target?.pop()?.display as string,
                            };
                        }
                    );
                    return {
                        [group.source as string]: elements,
                    };
                }
            );
            return transformObject(generatedData);
        }
    );

    data.forEach((obj: { [key: string]: { [key: string]: string } }): void => {
        Object.entries(obj).forEach(([key, value]): void => {
            if (!combinedData.hasOwnProperty(key)) {
                combinedData[key.toString()] = {};
            }
            Object.entries(value).forEach(([innerKey, innerValue]: [string, string]): void => {
                combinedData[key.toString()][innerKey.toString()] = innerValue;
            });
        });
    });

    return combinedData;
};
