import fs from "fs";
import path from "path";

import { ResourceLookUpTable, ValueSetLookUpTable } from "../src";
import { root } from "../src/Helper";
import _ValueSetLookUpTable from "../src/data/ValueSetLookUpTable.json";
import { generateValueSetLookUpTableWithGermanTranslations } from "../src/generators/main";

let loadedValueSetLookUpTableJson: ValueSetLookUpTable;
let loadResourceLookUpTable: ResourceLookUpTable;
describe("ValueSetLookUpTable", (): void => {
    beforeAll(() => {
        loadResourceLookUpTable = JSON.parse(
            fs.readFileSync(path.join(root, "src", "data", "PioSmallLookUpTable.json"), "utf-8")
        );

        loadedValueSetLookUpTableJson = JSON.parse(
            fs.readFileSync(path.join(root, "src", "data", "ValueSetLookUpTable.json"), "utf-8")
        );
    });
    it("should be able to import ValueSetLookUpTable", (): void => {
        expect(_ValueSetLookUpTable).toBeDefined();
        expect(loadedValueSetLookUpTableJson).toEqual(_ValueSetLookUpTable);
    });
    it("the generated ValueSetLookUpTable should be the same as the imported ValueSetLookUpTable", async (): Promise<void> => {
        const generatedValueSetLookUpTable =
            await generateValueSetLookUpTableWithGermanTranslations(loadResourceLookUpTable);
        expect(generatedValueSetLookUpTable).toEqual(loadedValueSetLookUpTableJson);
    }, 250000);
});
