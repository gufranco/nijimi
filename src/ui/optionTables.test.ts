import { describe, expect, it } from 'vitest';

import { EN } from '../i18n/en';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { HASH_FIELDS } from '../settings/hashFields';
import { OPTION_TABLES } from './optionTables';

describe('OPTION_TABLES', () => {
  it('offers only values the link parser accepts', () => {
    // Arrange
    const entries = Object.entries(OPTION_TABLES);

    // Act
    const rejected = entries.flatMap(([name, options]) => {
      const field = HASH_FIELDS.find((candidate) => candidate.key === name);
      return options
        .filter((option) => field?.apply(DEFAULT_SETTINGS, option.value) === null)
        .map((option) => `${name}=${option.value}`);
    });

    // Assert
    expect(rejected).toEqual([]);
  });

  it('labels every option from the catalog or with literal text', () => {
    // Arrange
    const options = Object.values(OPTION_TABLES).flat();

    // Act
    const unlabelled = options.filter((option) =>
      'label' in option ? !(option.label in EN) : option.text === ''
    );

    // Assert
    expect(unlabelled).toEqual([]);
  });
});
