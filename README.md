# PIO_FHIR_Resources
[Englische version](./README_EN.md)
## Einführung

In dieser Komponente werden JSON-Dateien erzeugt, die Strukturinformationen der PIO-ULB gemäß der FHIR
Spezifikation in Form von LookUpTables enthalten.

Des Weiteren wird eine weitere LookUpTable generiert, welche die entsprechenden Codesysteme und ValueSets für alle FHIR-Ressourcen enthält. 
Neben Terminologien wie LOINC, ICD und Alpha-ID verwendet die PIO-ULB-Spezifikation
hauptsächlich SNOMED-Codes, um die Interoperabilität zu gewährleisten.

Der PIO-ULB Editor unterstützt nur SNOMED-Codes vollständig; alle anderen Codesysteme
können zwar gelesen und angezeigt, aber nicht aktiv genutzt werden. Relevante Codesysteme wurden in englischer Sprache vom
"International SNOMED CT Browser" heruntergeladen und mit, deutschen Übersetzungen angereichert, soweit diese von der
KBV (Kassenärztliche Bundesvereinigung) oder mio42 GmbH in Form von ConceptMaps zur Verfügung gestellt wurden.


|                          | Beschreibung                                                                                      |
|:-------------------------|:--------------------------------------------------------------------------------------------------|
| ResourceLookUpTable      | Die ResourceLookUpTable enthält alle gültigen PIO-XML-Pfade mit zugehörigen Datentypen            |
| ResourceLookUpTableSmall | ResourceLookUpTableSmall stellt nur die PIO-Small                                                 |
| ValueSetLookUpTable      | Die ValueSetLookUpTable enthält alle Codesystemen und ValueSets welche zu einer Ressource gehören |

-----------------------------------------------------------------
## Voraussetzung
Um die JSON-Dateien zu generieren, müssen Sie [Node.js](https://nodejs.org/en/) installiert haben.
Um zu überprüfen, ob Node.js installiert ist und ob npm mitinstalliert wurde, geben Sie im Terminal den Befehl ein:
```bash
node -v
npm -v
```
Weitere Information und alternative Installationen finden Sie auf der [npm Website](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).  

Um nun die benötigten Bibliotheken zu installieren, geben Sie folgenden Befehl ein:
```bash
npm install
```

-----------------------------------------------------------------
## Quick Start

Um nun die JSON-Dateien zu generieren, geben Sie folgenden Befehl ein:

```bash
npm run run
```
Die generierten JSON-Dateien befinden sich im Ordner `src/data`.

