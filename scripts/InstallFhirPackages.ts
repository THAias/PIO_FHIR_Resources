#!/usr/bin/env ts-node

// Npm install script for fhir resources

// Variables for fhir versions
import { execSync } from "child_process";

const KBV_BASIS_VERSION = "1.3.0";
const DE_BASISPROFIL_R4_VERSION = "1.3.2";
const HL7_FHIR_R4_CORE_VERSION = "4.0.1";
const KBV_MIO_UEBERLEITUNGSBOGEN_VERSION = "1.0.0";
const IHE_FORMATCODE_VERSION = "1.1.0";

// Install fhir resources
console.log(`Installing FHIR Resource kbv.basis with version ${KBV_BASIS_VERSION}...`);
console.log(`Installing FHIR Resource de.basisprofil.r4 with version ${DE_BASISPROFIL_R4_VERSION}...`);
console.log(`Installing FHIR Resource hl7.fhir.r4.core with version ${HL7_FHIR_R4_CORE_VERSION}...`);
console.log(
    `Installing FHIR Resource kbv.mio.ueberleitungsbogen with version ${KBV_MIO_UEBERLEITUNGSBOGEN_VERSION}...`
);
console.log(`Installing FHIR Resource ihe.formatcode.fhir with version ${IHE_FORMATCODE_VERSION}...`);
const command = `npm --registry https://packages.simplifier.net install kbv.basis@${KBV_BASIS_VERSION} de.basisprofil.r4@${DE_BASISPROFIL_R4_VERSION} hl7.fhir.r4.core@${HL7_FHIR_R4_CORE_VERSION} kbv.mio.ueberleitungsbogen@${KBV_MIO_UEBERLEITUNGSBOGEN_VERSION} ihe.formatcode.fhir@${IHE_FORMATCODE_VERSION} --save-dev`;
execSync(command, { stdio: "inherit" });
