import fs from "fs";
import path from "path";

import {
    GermanTranslationsLookUpTable,
    PioSmallExclusions,
    ResourceLookUpTable,
    ValueSetLookUpTable,
    ValueSetLookUpTableCoding,
} from "../@types/CustomTypes";
import { root } from "../Helper";
import { addGermanRefSetTranslations } from "./GermanRefSetDownloader";
import { mergeGermanTranslation } from "./GermanTranslationsLookUpTable";
import { generatePIOSmallLookUpTable, generatePioSmallExclusionsTranslationList } from "./PioSmallLookUpTable";
import { generateResourceLookUpTable } from "./ResourceLookUpTable";
import { transformAllFiles } from "./TransfromXMLResources";
import { generateValueSetLookUpTable } from "./ValueSetLookUpTable";

export const generateValueSetLookUpTableWithGermanTranslations = async (
    resourceLookUpTable: ResourceLookUpTable
): Promise<ValueSetLookUpTable> => {
    return generateValueSetLookUpTable(resourceLookUpTable).then(
        async (valueSetLookUpTable: ValueSetLookUpTable): Promise<ValueSetLookUpTable> => {
            console.debug("Generating and merging GermanTranslations.json and ValueSetLookUpTable.json");
            return mergeGermanTranslation()
                .then((germanTranslationLookUpTable: GermanTranslationsLookUpTable) => {
                    Object.values(valueSetLookUpTable).forEach((value: ValueSetLookUpTableCoding[]): void => {
                        value.forEach((item: ValueSetLookUpTableCoding): void => {
                            if (
                                item.system &&
                                item.system in germanTranslationLookUpTable &&
                                item.code &&
                                item.code in germanTranslationLookUpTable[item.system]
                            ) {
                                item["germanDisplay"] = germanTranslationLookUpTable[item.system][item.code];
                            }
                        });
                    });
                    return valueSetLookUpTable;
                })
                .then((valueSetLookUpTable: ValueSetLookUpTable) => {
                    return addGermanRefSetTranslations(valueSetLookUpTable);
                });
        }
    );
};
transformAllFiles().then(() => console.log("Transformation Finished"));
generateResourceLookUpTable()
    .then((resourceLookUpTable: ResourceLookUpTable): void => {
        fs.promises
            .writeFile(path.join(root, "src", "data", "ResourceLookUpTable.json"), JSON.stringify(resourceLookUpTable))
            .then((): void => {
                console.debug("Finished generating ResourceLookUpTable.json");

                //Generation of PIOSmallLookUpTable
                generatePIOSmallLookUpTable(resourceLookUpTable).then((pioSmall: ResourceLookUpTable): void => {
                    fs.promises
                        .writeFile(path.join(root, "src", "data", "PioSmallLookUpTable.json"), JSON.stringify(pioSmall))
                        .then((): void => {
                            console.debug("Finished generating PIOSmallLookUpTable.json");
                        });
                    generateValueSetLookUpTableWithGermanTranslations(pioSmall).then(
                        async (valueSetLookUpTable: ValueSetLookUpTable): Promise<void> => {
                            await countGermanTranslations(valueSetLookUpTable);
                            console.log(`Amount of ValueSets: ${Object.keys(valueSetLookUpTable).length}`);
                            fs.promises
                                .writeFile(
                                    path.join(root, "src", "data", "ValueSetLookUpTable.json"),
                                    JSON.stringify(valueSetLookUpTable),
                                    "utf-8"
                                )
                                .then((): void => {
                                    console.debug(
                                        "Finished generating ValueSetLookUpTable.json with german translations"
                                    );

                                    //Generation of translation list of excluded paths
                                    generatePioSmallExclusionsTranslationList().then(
                                        (translationList: PioSmallExclusions): void => {
                                            fs.promises
                                                .writeFile(
                                                    path.join(
                                                        root,
                                                        "src",
                                                        "data",
                                                        "TranslationListOfExcludedPaths.json"
                                                    ),
                                                    JSON.stringify(translationList)
                                                )
                                                .then((): void => {
                                                    console.debug(
                                                        "Finished generating TranslationListOfExcludedPaths.json"
                                                    );
                                                });
                                        }
                                    );
                                });
                        }
                    );
                });
            });
    })
    .catch((reason): void => {
        console.log(reason);
    });

const countGermanTranslations = async (valueSetLookUpTable: ValueSetLookUpTable): Promise<void> => {
    let totalCountGerman: number = 0;
    let totalCountEnglish: number = 0;
    await Promise.all(
        Object.entries(valueSetLookUpTable).map(async ([key, value]): Promise<void> => {
            let count: number = 0;
            let countEnglish: number = 0;
            for (const item of value) {
                if (item.germanDisplay) {
                    count++;
                }
                countEnglish++;
            }
            totalCountGerman += count;
            totalCountEnglish += countEnglish;
            console.debug(`${key}: ${count}/${value.length}`);
        })
    );
    console.log(
        "Counting German Translations finished",
        `Total: German:${totalCountGerman} / All:${totalCountEnglish}`,
        `In Total ${parseFloat(String((totalCountGerman / totalCountEnglish) * 100)).toFixed(2)}% of the ValueSetLookUpTable has German translations`
    );
};
