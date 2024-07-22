import axios, { AxiosInstance, AxiosResponse } from "axios";
import rateLimit, { RateLimitedAxiosInstance } from "axios-rate-limit";

import { ValueSetLookUpTable, ValueSetLookUpTableCoding } from "../@types/CustomTypes";
import { RefSet, RefSetItem } from "../@types/RefSetTypes";
import { getFromCache, saveToCache } from "../cache/cacheHandler";

const axiosClient: AxiosInstance = axios.create({
    baseURL: `https://browser.ihtsdotools.org/snowstorm/snomed-ct/MAIN/SNOMEDCT-DE`,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Connection: "keep-alive",
        "Accept-Language": "de",
        "User-Agent": "Care-Regio-Pio-Editor/1.00",
    },
});

/**
 * The response handler for axios
 */
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

/**
 * Download the refSet from community-snowstorm
 * @param {string} refSetID The refSet id to downlaod
 * @param {string} searchAfter If the RefSet has more the 10000 items, elastic search needs the searchAfter string to return the elements after the previous 10000
 * @returns {Promise<AxiosResponse<RefSet>>} AxiosResponse of the refSet get request
 */
const getRefSet = (refSetID: string, searchAfter?: string): Promise<AxiosResponse<RefSet>> =>
    rateLimitAxiosClient.get("/members", {
        params: {
            referenceSet: refSetID,
            limit: 10000,
            active: true,
            searchAfter: searchAfter,
        },
    });

/**
 * Return all merged RefSets for every RefSet Id if the refSet has more than 10000 items
 * @param {Record<string,string>} refSetIds a dictionary with the RefSet names and id
 * @returns {Promise<RefSet>[]} The merged refSets
 */
const getAllRefSets = (refSetIds: Record<string, string>): Promise<RefSet>[] => {
    return Object.entries(refSetIds).map(async ([key, refSetId]): Promise<RefSet> => {
        const chachedRefSet: RefSet | null = await getFromCache(key);
        if (chachedRefSet) {
            console.debug(`Get ${chachedRefSet?.items?.length}/${chachedRefSet?.total} from ${key} from cache`);
            return chachedRefSet;
        } else {
            let refSet: RefSet = {} as RefSet;
            let itemLength: number = 0;
            /**
             * Helper function to merge refSets if they have more than 100000 items
             * @param {string} searchAfter the elastic search searchAfter token
             */
            const recursiveHelper = async (searchAfter?: string): Promise<void> => {
                const response: AxiosResponse<RefSet> = await getRefSet(refSetId, searchAfter);
                if (response.data) {
                    itemLength += response.data.items.length;
                    if (refSet && refSet.items) {
                        refSet.items = refSet.items.concat(response.data.items);
                    } else {
                        refSet = response.data;
                    }
                    if (itemLength < response.data.total) {
                        await recursiveHelper(response.data.searchAfter);
                    }
                } else {
                    console.error(`There is a problem to retrieve the data from: ${key} with ID: ${refSetId}`);
                }
            };
            await recursiveHelper();
            console.debug(
                `Get ${refSet?.items?.length}/${refSet?.total} from ${key} from community-snowstorm and saved it to cache`
            );

            // Cache the refSet
            await saveToCache(key, refSet);

            return refSet;
        }
    });
};

/**
 * Transform the RefSet data to ValueSetLookUpTableCoding -> that means the german display value has to be extracted
 * @param {RefSet} refSet the refSet to extract the information from
 * @returns {Record<string, ValueSetLookUpTableCoding>} An object with the code as key and the ValueSetLookUpTableCoding as value
 */
const extractGermanRefSetData = (refSet: RefSet): Record<string, ValueSetLookUpTableCoding> => {
    const refSetData: Record<string, ValueSetLookUpTableCoding> = {};
    refSet.items.forEach((item: RefSetItem): void => {
        refSetData[item.referencedComponent.conceptId] = {
            code: item.referencedComponent.conceptId,
            display: item.referencedComponent.fsn.term,
            germanDisplay: item.referencedComponent.pt.term,
        };
    });
    return refSetData;
};

/**
 * Helper function to check if the original ValueSetLookUpTable entry has to be updated or not
 * @param {Record<string, ValueSetLookUpTableCoding>} germanRefSetData Previously generated object with the code as key and the code as value
 * @param {ValueSetLookUpTable} valueSetLookUpTable ValueSetLookUpTable to update
 * @returns {ValueSetLookUpTable} The updated ValueSetLookUpTable
 */
const mergeRefSetDataValueSetLookUpTable = (
    germanRefSetData: Record<string, ValueSetLookUpTableCoding>,
    valueSetLookUpTable: ValueSetLookUpTable
): ValueSetLookUpTable => {
    Object.values(valueSetLookUpTable).forEach((entries: ValueSetLookUpTableCoding[]): void => {
        entries.forEach((entry: ValueSetLookUpTableCoding): void => {
            if (germanRefSetData[entry.code as string] && entry.germanDisplay === undefined) {
                entry.germanDisplay = germanRefSetData[entry.code as string].germanDisplay;
            }
        });
    });
    return valueSetLookUpTable;
};

/**
 * Main function to trigger the whole process to update the ValueSetLookUpTable with german refSet codes
 * @param {ValueSetLookUpTable} valueSetLookUpTable The valueSetLookUpTable to update
 * @returns {ValueSetLookUpTable} The updated valueSetLookUpTable
 */
export const addGermanRefSetTranslations = async (
    valueSetLookUpTable: ValueSetLookUpTable
): Promise<ValueSetLookUpTable> => {
    console.debug("\nStart adding german translations from refSets");
    const refSetIDs: Record<string, string> = {
        Allergene: "30121001000107",
        "Manifestation von Allergien": "30111001000102",
        "Unerwünschte Reaktionen bei Impfungen": "30131001000105",
        "Allergie/ Unverträglichkeiten bei Impfungen": "30141001000103",
        "Zielkrankheit von Impfungen": "30151001000101",
        "Immunisierung: Impfplan": "30161001000104",
        "MIO Basis-Profile": "71001000103",
        "MIO Kinderuntersuchungsheft": "10071001000102",
        "MIO Impfpass": "91001000102",
        "MIO Mutterpass": "81001000100",
        ORPHAcodes: "50111001000103",
        Mikroorgansimen: "30101001000100",
        Substanzen: "20081001000107",
        "Top-Level-Konzepte und gängige Begriffe": "30191001000109",
        Einheit: "30181001000106",
        Impfprodukte: "30171001000108",
    };
    const refSets: Promise<RefSet>[] = getAllRefSets(refSetIDs);

    return await Promise.all(
        refSets.map(async (refSet: Promise<RefSet>): Promise<void> => {
            const refSetData: RefSet = await refSet;
            const germanRefSetData: Record<string, ValueSetLookUpTableCoding> = extractGermanRefSetData(refSetData);
            valueSetLookUpTable = mergeRefSetDataValueSetLookUpTable(germanRefSetData, valueSetLookUpTable);
        })
    ).then((): ValueSetLookUpTable => {
        console.debug("Finished adding german translations from refSets\n\n");
        return valueSetLookUpTable;
    });
};
