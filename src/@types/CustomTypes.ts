import {
    CodeSystemConcept,
    Coding,
    ValueSetComposeInclude,
    ValueSetComposeIncludeFilter,
    ValueSetExpansionContains,
} from "./Types";

export interface PioSmallExclusions {
    [key: string]: ResourceExclusions;
}

export interface ResourceExclusions {
    wholeResourceExcluded: boolean;
    translation: string;
    cardinalityReducedToOne: string[];
    excludedPaths: ExcludedPaths | null;
}

export interface ExcludedPaths {
    [key: string]: string | null;
}

export interface ResourceLookUpTable {
    [key: string]: ResourceLookUpTableEntry;
}

export interface ResourceLookUpTableEntry {
    resource: ResourceLookUpTableResource;
    paths: ResourceLookUpTablePaths;
}

export interface ResourceLookUpTablePaths {
    [key: string]: ResourceLookUpTablePathsElement;
}

export interface ResourceLookUpTablePathsElement {
    type: string;
    profileUrl?: string | string[];
    valueSet?: string | string[];
    fixedValue?: string | string[];
}

export interface ResourceLookUpTableResource {
    status?: string;
    profile: string;
    "fhir-resource-type": string;
}

export interface PreValueSetLookUpTable {
    [key: string]: {
        include: ValueSetLookUpTableInclude[];
        expansion?: ValueSetExpansionContains[];
    };
}

export interface ValueSetLookUpTable {
    [key: string]: ValueSetLookUpTableCoding[];
}

export interface ValueSetLookUpTableInclude {
    concept?: ValueSetLookUpTableCoding[];
    system?: string;
    version?: string;
    include?: ValueSetComposeInclude[];
    valueSet?: string[];
    expansion?: ValueSetExpansionContains[];
    filter?: ValueSetComposeIncludeFilter[];
}

export interface ValueSetLookUpTableCoding extends Coding {
    germanDisplay?: string;
}

export interface CodeSystemLookUpTableInclude {
    system?: string;
    version?: string;
    concept?: CodeSystemConcept[];
}

export interface ValueSetLookUpTableCode {
    [key: string]: string;
}

export interface ValueSetLookUpTableDisplayNames {
    [key: string]: Coding;
}

export interface GermanTranslationsLookUpTable {
    [p: string]: { [p: string]: string };
}

export type FixedValue = string | number | boolean;

export type SelectOption = { value: string; label: string };
export type SelectOptions = SelectOption[];
