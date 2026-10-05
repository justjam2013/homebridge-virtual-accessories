/* eslint-disable no-undef */

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const schemaFile = 'config.schema.json';
const translationsDirectory = 'schemas/translations';
const templateFile = `${translationsDirectory}/template.json`;

const translatableProperties = new Set([
  'title',
  'description',
]);

const schema = JSON.parse(await readFile(schemaFile, 'utf8'));

const strings = new Set();

const extract = (value, property) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      extract(item);
    }

    return;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      extract(child, key);
    }

    return;
  }

  if (
    typeof value === 'string'
    && value.trim()
    && translatableProperties.has(property)
  ) {
    strings.add(value);
  }
};

extract(schema);

const template = Object.fromEntries(
  [...strings].map(value => [value, '']),
);

await mkdir(translationsDirectory, { recursive: true });

await writeFile(
  templateFile,
  `${JSON.stringify(template, null, 2)}\n`,
);

console.log(
  `Created ${templateFile} with ${strings.size} translatable strings.`,
);
