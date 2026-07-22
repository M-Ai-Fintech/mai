# English Internal Identifiers with i18n

This M&A middleware operates in the Brazilian market, meaning the actual domain experts and end-users speak Portuguese (e.g., they say "Societário", not "Corporate"). However, mixing Portuguese and English within the codebase leads to brittle logic and fragmented taxonomies.

We have decided that **all internal identifiers, enums, schemas, and database values must be exclusively in English**. 
Portuguese (and any other language) is strictly treated as a display concern and must be handled exclusively through an `i18n` (internationalization) translation layer. 

No domain logic or conditional checks should ever test against a Portuguese string literal. If the UI needs to show "Trabalhista", the backend still sends `"labor"`, and the frontend maps it via the `i18n` dictionary.
