# PIO_FHIR_Resources
[German version](./README.md)
## Introduction

This component generates JSON files that contain structural information of the PIO-ULB according to the FHIR specification in the form of LookUpTables.

Additionally, another LookUpTable is generated which contains the corresponding code systems and value sets for all FHIR resources. Besides terminologies like LOINC, ICD, and Alpha-ID, the PIO-ULB specification mainly uses SNOMED codes to ensure interoperability.

The PIO-ULB Editor fully supports only SNOMED codes; all other code systems can be read and displayed but not actively used. Relevant code systems were downloaded in English from the “International SNOMED CT Browser” and enriched with German translations, provided these were available from KBV (Kassenärztliche Bundesvereinigung) or mio42 GmbH in the form of ConceptMaps.


|                          | Beschreibung                                                                               |
|:-------------------------|:-------------------------------------------------------------------------------------------|
| ResourceLookUpTable      | The ResourceLookUpTable contains all valid PIO-XML paths with associated data types        |
| ResourceLookUpTableSmall | ResourceLookUpTableSmall provides only the PIO-Small                                       |
| ValueSetLookUpTable      | The ValueSetLookUpTable contains all code systems and value sets that belong to a resource |

-----------------------------------------------------------------
## Requirements
To generate the JSON files, you need to have [Node.js](https://nodejs.org/en/) installed.  
To check if Node.js is installed and if npm was installed with it, enter the following command in the terminal:
```bash
node -v
npm -v
```
For more information and alternative installations, visit the [npm website](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

To install the required libraries, enter the following command:
```bash
npm install
```

-----------------------------------------------------------------
## Quick Start

To generate the JSON files, enter the following command:

```bash
npm run run
```
The generated JSON files are located in the `src/data` folder.

