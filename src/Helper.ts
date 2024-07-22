import path from "path";

export const root: string = path.join(__dirname, "..");

/**
 * Modifies the extension paths to be compatible with the FHIR specification (e.g. "extension[x].extensionString" -> "extensionString")
 * @param {string} path The path to modify
 * @returns {string} The modified path
 */
export const modifyExtensionPaths = (path: string): string => {
    if (!path.includes("[x]")) {
        return path;
    }
    const segments: string[] = path.split(".");

    // Iterate through the segments in reverse order
    for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i.valueOf()].includes("[x]")) {
            segments[i.valueOf()] = segments[i.valueOf()].split(":")[1] ?? segments[i.valueOf()];
        }
        if (segments[i.valueOf()].includes(":") && !segments[i.valueOf()].startsWith("extension:")) {
            segments[i.valueOf()] = segments[i.valueOf()].split(":")[0];
        }
    }
    return segments.join(".");
};

/**
 * Capitalizes the first letter of a string
 * @param {string} str The string to capitalize
 * @returns {string | undefined} The capitalized string
 */
export const capitalize = (str?: string): string | undefined => {
    if (str !== undefined) {
        if (str.length === 0) {
            return str;
        }
        const [firstLetter, ...rest] = str;
        return `${firstLetter.toUpperCase()}${rest.join("")}`;
    }
};
