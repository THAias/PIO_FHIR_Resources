import fs from "fs";
import path from "path";

import { ResourceLookUpTable } from "../src";
import { root } from "../src/Helper";
import _ResourceLookUpTable from "../src/data/ResourceLookUpTable.json";
import { generateResourceLookUpTable, getStructureDefinitionWithSnapshot } from "../src/generators/ResourceLookUpTable";

let loadedResourceLookUpTableJson: ResourceLookUpTable;
describe("ResourceLookUpTable", (): void => {
    beforeAll((): void => {
        loadedResourceLookUpTableJson = JSON.parse(
            fs.readFileSync(path.join(root, "src", "data", "ResourceLookUpTable.json"), "utf-8")
        ) as ResourceLookUpTable;
    });
    it("should be able to import ResourceLookUpTableJson", (): void => {
        expect(_ResourceLookUpTable).toBeDefined();
        expect(loadedResourceLookUpTableJson).toEqual(_ResourceLookUpTable);
    });
    it("the generated ResourceLookUpTable should be the same as the imported ResourceLookUpTable", async (): Promise<void> => {
        const generatedResourceLookUpTableJson: ResourceLookUpTable = await generateResourceLookUpTable();
        expect(generatedResourceLookUpTableJson).toEqual(loadedResourceLookUpTableJson);
    }, 300000);

    it("should throw an error when fetch fails and no more retries left", async (): Promise<void> => {
        const name: string = "exampleStructureDefinition";
        await expect(getStructureDefinitionWithSnapshot(name, 0)).rejects.toThrow();
    });
});
