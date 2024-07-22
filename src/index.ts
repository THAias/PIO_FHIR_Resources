import {
    PioSmallExclusions,
    ResourceLookUpTable,
    ResourceLookUpTableEntry,
    ResourceLookUpTablePaths,
    ResourceLookUpTablePathsElement,
    ResourceLookUpTableResource,
    SelectOption,
    SelectOptions,
    ValueSetLookUpTable,
    ValueSetLookUpTableCode,
    ValueSetLookUpTableCoding,
    ValueSetLookUpTableDisplayNames,
    ValueSetLookUpTableInclude,
} from "./@types/CustomTypes";
import {
    Address,
    Age,
    Annotation,
    Attachment,
    BackboneElement,
    CodeSystem,
    CodeSystemConcept,
    CodeSystemConceptDesignation,
    CodeSystemConceptProperty,
    CodeSystemFilter,
    CodeSystemProperty,
    CodeableConcept,
    Coding,
    ContactDetail,
    ContactPoint,
    Contributor,
    Count,
    DataRequirement,
    DataRequirementCodeFilter,
    DataRequirementDateFilter,
    DataRequirementSort,
    Distance,
    DomainResource,
    Dosage,
    DosageDoseAndRate,
    Duration,
    Element,
    ElementDefinition,
    ElementDefinitionBase,
    ElementDefinitionBinding,
    ElementDefinitionConstraint,
    ElementDefinitionExample,
    ElementDefinitionMapping,
    ElementDefinitionSlicing,
    ElementDefinitionSlicingDiscriminator,
    ElementDefinitionType,
    Expression,
    Extension,
    FhirResource,
    HumanName,
    Identifier,
    Meta,
    Money,
    Narrative,
    ParameterDefinition,
    Period,
    Quantity,
    Range,
    Ratio,
    Reference,
    RelatedArtifact,
    Resource,
    SampledData,
    Signature,
    StructureDefinition,
    StructureDefinitionContext,
    StructureDefinitionDifferential,
    StructureDefinitionMapping,
    StructureDefinitionSnapshot,
    Timing,
    TimingRepeat,
    TriggerDefinition,
    UsageContext,
    ValueSet,
    ValueSetCompose,
    ValueSetComposeInclude,
    ValueSetComposeIncludeConcept,
    ValueSetComposeIncludeConceptDesignation,
    ValueSetComposeIncludeFilter,
    ValueSetExpansion,
    ValueSetExpansionContains,
    ValueSetExpansionParameter,
} from "./@types/Types";
import _PioSmallLookUpTableJson from "./data/PioSmallLookUpTable.json";
import _ResourceLookUpTableJson from "./data/ResourceLookUpTable.json";
import _TranslationListOfExcludedPathsJson from "./data/TranslationListOfExcludedPaths.json";
import _ValueSetLookUpTableJson from "./data/ValueSetLookUpTable.json";

export {
    CodeSystem,
    ValueSet,
    StructureDefinition,
    Coding,
    CodeSystemConcept,
    CodeSystemConceptDesignation,
    ValueSetComposeIncludeConcept,
    ValueSetComposeIncludeConceptDesignation,
    ValueSetExpansionContains,
    ValueSetExpansion,
    ElementDefinition,
    StructureDefinitionSnapshot,
    Age,
    CodeSystemConceptProperty,
    CodeSystemFilter,
    CodeSystemProperty,
    ValueSetComposeInclude,
    Address,
    CodeableConcept,
    Annotation,
    BackboneElement,
    Element,
    Attachment,
    ElementDefinitionBase,
    ElementDefinitionBinding,
    ElementDefinitionExample,
    ElementDefinitionMapping,
    ElementDefinitionSlicing,
    ElementDefinitionType,
    ElementDefinitionSlicingDiscriminator,
    ElementDefinitionConstraint,
    ContactDetail,
    ContactPoint,
    Count,
    Contributor,
    DataRequirementCodeFilter,
    DataRequirementDateFilter,
    DataRequirement,
    DataRequirementSort,
    Distance,
    Dosage,
    ValueSetCompose,
    DomainResource,
    DosageDoseAndRate,
    Duration,
    Expression,
    Extension,
    FhirResource,
    Meta,
    HumanName,
    Money,
    ParameterDefinition,
    Identifier,
    Period,
    StructureDefinitionMapping,
    StructureDefinitionContext,
    StructureDefinitionDifferential,
    Narrative,
    Range,
    Ratio,
    Quantity,
    Resource,
    SampledData,
    ValueSetComposeIncludeFilter,
    ValueSetExpansionParameter,
    Reference,
    TriggerDefinition,
    Timing,
    TimingRepeat,
    UsageContext,
    RelatedArtifact,
    Signature,
};

export {
    ValueSetLookUpTable,
    ResourceLookUpTable,
    ResourceLookUpTableEntry,
    ResourceLookUpTablePaths,
    ResourceLookUpTablePathsElement,
    ResourceLookUpTableResource,
    ValueSetLookUpTableInclude,
    ValueSetLookUpTableCoding,
    ValueSetLookUpTableCode,
    ValueSetLookUpTableDisplayNames,
    SelectOptions,
    SelectOption,
};

const ResourceLookUpTableJson: ResourceLookUpTable = _ResourceLookUpTableJson as ResourceLookUpTable;
const PioSmallLookUpTableJson: ResourceLookUpTable = _PioSmallLookUpTableJson as ResourceLookUpTable;

const ValueSetLookUpTableJson: ValueSetLookUpTable = _ValueSetLookUpTableJson as ValueSetLookUpTable;
const TranslationListOfExcludedPaths: PioSmallExclusions = _TranslationListOfExcludedPathsJson as PioSmallExclusions;

export { ResourceLookUpTableJson, PioSmallLookUpTableJson, TranslationListOfExcludedPaths, ValueSetLookUpTableJson };
