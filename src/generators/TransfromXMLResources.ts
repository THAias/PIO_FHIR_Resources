import { Fhir } from "fhir";
import fs from "fs";
import path from "path";

import { root } from "../Helper";

/**
 * function to read all XML files
 * @param {string} dir the folder to read the xml files from
 * @param {(file: string) => boolean} fileFilter filter function to ignore files in the given directory
 * @returns {AsyncGenerator<string>} the read XML file as string
 * @yields string
 */
const readAllXML = async function* (dir: string, fileFilter: (file: string) => boolean): AsyncGenerator<string> {
    /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as no value holds user input */
    const files: string[] = await fs.promises.readdir(dir, "utf8");
    for (const file of files) {
        const filepath: string = path.join(dir, file);
        if (fileFilter(file)) {
            try {
                /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as no value holds user input */
                yield await fs.promises.readFile(filepath, "utf8");
            } catch (e: unknown) {
                if (e instanceof Error) {
                    console.error(`Error parsing XML file "${filepath}": ${e.message}`);
                } else {
                    console.error(`Unknown error parsing XML file "${filepath}": ${e}`);
                }
            }
        }
    }
};

/**
 * Helper function to transform downloaded XML files into JSONs
 */
export const transformAllFiles = async (): Promise<void> => {
    const dir: string = path.join(root, "KBV_SFHIR", "XML");
    for await (const file of readAllXML(dir, (file: string) => file.endsWith(".xml"))) {
        const parsedXML = JSON.parse(new Fhir().xmlToJson(file));
        const XMLFileVersion = parsedXML.version;
        /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as no value holds user input */
        const JSONFileVersion = await fs.promises
            .readFile(path.join(root, "KBV_SFHIR", `${parsedXML.id}.json`), "utf8")
            .then((data: string) => JSON.parse(data).version)
            .catch(() => undefined);
        if (XMLFileVersion !== JSONFileVersion) {
            /* eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe as no value holds user input */
            fs.writeFile(
                path.join(root, "KBV_SFHIR", `${parsedXML.id}.json`),
                JSON.stringify(parsedXML, null, 4),
                (err: Error | null): void => {
                    if (err) {
                        console.error(`Error writing JSON file "${parsedXML.id}.json": ${err.message}`);
                    }
                }
            );
        } else {
            console.log(`The file: ${parsedXML.id} already exist as JSON with the same version as the XML file.`);
        }
    }
};
