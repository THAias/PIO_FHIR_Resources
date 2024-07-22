import { ConceptMap } from "../src/@types/Types";
import { saveToCache } from "../src/cache/cacheHandler";
import { getConceptMaps } from "../src/generators/GermanTranslationsLookUpTable";
import { simplifiedConceptMap } from "./constants";

// Mocking fetch function
global.fetch = jest.fn();

// Mocking cache functions
jest.mock("../src/cache/cacheHandler", () => ({
    getFromCache: jest.fn(),
    saveToCache: jest.fn(),
}));

describe("getConceptMaps", (): void => {
    beforeEach(() => {
        // Clear mock calls before each test
        jest.clearAllMocks();
    });

    it("should fetch and return ConceptMap", async (): Promise<void> => {
        const mockConceptMap: ConceptMap = simplifiedConceptMap;

        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue(mockConceptMap),
        };

        (fetch as jest.Mock).mockResolvedValue(mockResponse);

        const urls = ["https://simplifier.net/base1x0/kbv-cm-base-terminology-complete-german/$download?format=json"];
        const result: (ConceptMap | undefined)[] = await Promise.all(getConceptMaps(urls));

        expect(result).toEqual([mockConceptMap]);

        expect(saveToCache).toHaveBeenCalledWith("conceptMap_kbv-cm-base-terminology-complete-german", mockConceptMap);
    });

    it("should handle non-OK response from fetch", async (): Promise<void> => {
        const errorSpy: jest.SpyInstance = jest.spyOn(global.console, "error");
        const mockResponse = {
            ok: false,
            status: 404,
            statusText: "Not Found",
        };

        (fetch as jest.Mock).mockResolvedValue(mockResponse);

        const urls: string[] = ["http://example.com/conceptmap"];
        const result: Awaited<ConceptMap | undefined>[] = await Promise.all(getConceptMaps(urls));

        expect(result).toEqual([undefined]);

        // Verify error message is logged
        expect(errorSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith("Error fetching ConceptMap for example.com: 404 Not Found");
    });

    it("should handle fetch error", async (): Promise<void> => {
        const errorSpy: jest.SpyInstance = jest.spyOn(global.console, "error");
        const mockError: Error = new Error("Fetch error");
        (fetch as jest.Mock).mockRejectedValue(mockError);

        const urls: string[] = ["http://example.com/conceptmap"];
        const result: (ConceptMap | undefined)[] = await Promise.all(getConceptMaps(urls));

        expect(result).toEqual([undefined]);

        // Verify error message is logged
        expect(errorSpy).toHaveBeenCalledWith(mockError);
    });
});
