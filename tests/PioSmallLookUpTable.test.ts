import fs from "fs";
import path from "path";

import { ResourceLookUpTable } from "../src";
import { root } from "../src/Helper";
import _PioSmallLookUpTable from "../src/data/PioSmallLookUpTable.json";
import _ResourceLookUpTable from "../src/data/ResourceLookUpTable.json";
import { generatePIOSmallLookUpTable } from "../src/generators/PioSmallLookUpTable";

let loadedResourceLookUpTableJson: ResourceLookUpTable;
describe("PioSmallLookUpTable", (): void => {
    beforeAll((): void => {
        loadedResourceLookUpTableJson = JSON.parse(
            fs.readFileSync(path.join(root, "src", "data", "PioSmallLookUpTable.json"), "utf-8")
        ) as ResourceLookUpTable;
    });
    it("should be able to import PioSmallLookUpTableJson", (): void => {
        expect(_PioSmallLookUpTable).toBeDefined();
        expect(loadedResourceLookUpTableJson).toEqual(_PioSmallLookUpTable);
    });
    it("the generated PioSmallLookUpTableJson should be the same as the imported PioSmallLookUpTable", async (): Promise<void> => {
        const generatedResourceLookUpTableJson: ResourceLookUpTable =
            await generatePIOSmallLookUpTable(_ResourceLookUpTable);
        expect(generatedResourceLookUpTableJson).toEqual(loadedResourceLookUpTableJson);
    }, 300000);
});
