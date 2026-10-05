/* eslint-disable no-undef */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const schemaFile = 'config.schema.json';
const translationsDirectory = 'schemas/translations';
const schemasDirectory = 'schemas';

const translatableProperties = new Set([
  'title',
  'description',
]);

const schemaSource = await readFile(schemaFile, 'utf8');
const schema = JSON.parse(schemaSource);

const translationFiles = (await readdir(translationsDirectory))
  .filter(file => /^[a-z]{2}\.json$/.test(file))
  .sort();

for (const translationFile of translationFiles) {
  const language = basename(translationFile, '.json');

  const translations = JSON.parse(
    await readFile(join(translationsDirectory, translationFile), 'utf8'),
  );

  const usedTranslations = new Set();
  const missingTranslations = new Set();
  const replacements = new Map();

  const translate = (value, property) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        translate(item);
      }

      return;
    }

    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        translate(child, key);
      }

      return;
    }

    if (
      typeof value === 'string'
      && value.trim()
      && translatableProperties.has(property)
    ) {
      if (Object.hasOwn(translations, value)) {
        usedTranslations.add(value);
        replacements.set(value, translations[value]);
        return;
      }

      missingTranslations.add(value);
    }
  };

  translate(schema);

  const unusedTranslations = Object.keys(translations)
    .filter(key => !usedTranslations.has(key));

  if (missingTranslations.size > 0) {
    console.error(`Missing translations in ${translationFile}:`);

    for (const value of [...missingTranslations].sort()) {
      console.error(`  ${JSON.stringify(value)}`);
    }
  }

  if (unusedTranslations.length > 0) {
    console.warn(`Unused translations in ${translationFile}:`);

    for (const value of unusedTranslations.sort()) {
      console.warn(`  ${JSON.stringify(value)}`);
    }
  }

  if (missingTranslations.size > 0) {
    process.exitCode = 1;
    continue;
  }

  let translatedSchema = schemaSource;

  for (const [source, translation] of replacements) {
    for (const property of translatableProperties) {
      translatedSchema = translatedSchema.replaceAll(
        `${JSON.stringify(property)}: ${JSON.stringify(source)}`,
        `${JSON.stringify(property)}: ${JSON.stringify(translation)}`,
      );
    }
  }

  const outputFile = join(
    schemasDirectory,
    `config.schema.${language}.json`,
  );

  await writeFile(
    outputFile,
    translatedSchema,
  );

  console.log(`Generated ${outputFile}`);
}
