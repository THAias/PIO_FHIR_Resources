import { capitalize, modifyExtensionPaths } from "../src/Helper";

describe("modifyExtensionPaths", (): void => {
    // Tests that the function returns the same path if it does not contain "[x]"
    it('should return the same path when it does not contain "[x]"', (): void => {
        const path: string = "extensionString";
        const result: string = modifyExtensionPaths(path);
        expect(result).toBe(path);
    });

    // Tests that the function returns an empty string if the input is an empty string
    it("should return an empty string when the input is an empty string", (): void => {
        const path: string = "";
        const result: string = modifyExtensionPaths(path);
        expect(result).toBe("");
    });

    // Tests that the function returns the same path if it only contains "[x]"
    it('should return the same path when it only contains "[x]"', (): void => {
        const path: string = "[x]";
        const result: string = modifyExtensionPaths(path);
        expect(result).toBe(path);
    });

    // Tests that the function returns the same path if it contains "[x]" but no colon
    it('should return the same path when it contains "[x]" but no colon', (): void => {
        const path: string = "extension[x]";
        const result: string = modifyExtensionPaths(path);
        expect(result).toBe(path);
    });

    it("Should return the same path", (): void => {
        const path: string = "resource.extension:extensionString";
        const result: string = modifyExtensionPaths(path);
        expect(result).toBe("resource.extension:extensionString");
    });
});

describe("capitalize", (): void => {
    // Tests that the function capitalizes the first letter of a string
    it("should capitalize the first letter of a string", (): void => {
        const result: string | undefined = capitalize("hello");
        expect(result).toBe("Hello");
    });

    // Tests that the function returns the same string if it's already capitalized
    it("should return the same string if it's already capitalized", (): void => {
        const result: string | undefined = capitalize("Hello");
        expect(result).toBe("Hello");
    });

    // Tests that the function returns an empty string if an empty string is passed
    it("should return an empty string if an empty string is passed", (): void => {
        const result: string | undefined = capitalize("");
        expect(result).toBe("");
    });
});
