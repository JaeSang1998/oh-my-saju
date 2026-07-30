import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultProjectRoot = fileURLToPath(new URL('../', import.meta.url));

export class JsonSchemaDefinitionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonSchemaDefinitionError';
  }
}

function escapeJsonPointerToken(token) {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function appendJsonPointer(pointer, token) {
  return `${pointer}/${escapeJsonPointerToken(String(token))}`;
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, expectedType) {
  switch (expectedType) {
    case 'null':
      return value === null;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'integer':
      return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string':
    case 'boolean':
      return typeof value === expectedType;
    default:
      throw new JsonSchemaDefinitionError(`Unsupported JSON Schema type: ${expectedType}`);
  }
}

function resolveLocalReference(rootSchema, reference) {
  if (!reference.startsWith('#')) {
    throw new JsonSchemaDefinitionError(
      `Only local JSON Schema references are supported: ${reference}`,
    );
  }

  const fragment = decodeURIComponent(reference.slice(1));
  if (fragment === '') return { schema: rootSchema, schemaPath: '' };
  if (!fragment.startsWith('/')) {
    throw new JsonSchemaDefinitionError(`Unsupported JSON Schema fragment: ${reference}`);
  }

  let current = rootSchema;
  let schemaPath = '';
  for (const encodedToken of fragment.slice(1).split('/')) {
    const token = encodedToken.replaceAll('~1', '/').replaceAll('~0', '~');
    if (
      typeof current !== 'object' ||
      current === null ||
      Array.isArray(current) ||
      !Object.hasOwn(current, token)
    ) {
      throw new JsonSchemaDefinitionError(`Unresolved JSON Schema reference: ${reference}`);
    }
    current = current[token];
    schemaPath = appendJsonPointer(schemaPath, token);
  }
  return { schema: current, schemaPath };
}

function issue(instancePath, schemaPath, keyword, message) {
  return { instancePath, schemaPath: appendJsonPointer(schemaPath, keyword), keyword, message };
}

function validateNode(schema, value, context) {
  if (schema === true) return [];
  if (schema === false) {
    return [
      issue(
        context.instancePath,
        context.schemaPath,
        'falseSchema',
        'value is forbidden by schema',
      ),
    ];
  }
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    throw new JsonSchemaDefinitionError(
      `Schema at #${context.schemaPath} must be an object or boolean`,
    );
  }

  const errors = [];
  const validateSubschema = (subschema, nextValue, instancePath, schemaPath) =>
    validateNode(subschema, nextValue, {
      ...context,
      instancePath,
      schemaPath,
    });

  if (schema.$ref !== undefined) {
    if (typeof schema.$ref !== 'string') {
      throw new JsonSchemaDefinitionError(`$ref at #${context.schemaPath} must be a string`);
    }
    const referenced = resolveLocalReference(context.rootSchema, schema.$ref);
    errors.push(
      ...validateSubschema(referenced.schema, value, context.instancePath, referenced.schemaPath),
    );
  }

  if (schema.allOf !== undefined) {
    if (!Array.isArray(schema.allOf)) {
      throw new JsonSchemaDefinitionError(`allOf at #${context.schemaPath} must be an array`);
    }
    schema.allOf.forEach((subschema, index) => {
      errors.push(
        ...validateSubschema(
          subschema,
          value,
          context.instancePath,
          appendJsonPointer(appendJsonPointer(context.schemaPath, 'allOf'), index),
        ),
      );
    });
  }

  if (schema.anyOf !== undefined) {
    if (!Array.isArray(schema.anyOf) || schema.anyOf.length === 0) {
      throw new JsonSchemaDefinitionError(
        `anyOf at #${context.schemaPath} must be a non-empty array`,
      );
    }
    const matches = schema.anyOf.filter(
      (subschema, index) =>
        validateSubschema(
          subschema,
          value,
          context.instancePath,
          appendJsonPointer(appendJsonPointer(context.schemaPath, 'anyOf'), index),
        ).length === 0,
    );
    if (matches.length === 0) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'anyOf',
          'value must match at least one schema',
        ),
      );
    }
  }

  if (schema.oneOf !== undefined) {
    if (!Array.isArray(schema.oneOf) || schema.oneOf.length === 0) {
      throw new JsonSchemaDefinitionError(
        `oneOf at #${context.schemaPath} must be a non-empty array`,
      );
    }
    const matchCount = schema.oneOf.filter(
      (subschema, index) =>
        validateSubschema(
          subschema,
          value,
          context.instancePath,
          appendJsonPointer(appendJsonPointer(context.schemaPath, 'oneOf'), index),
        ).length === 0,
    ).length;
    if (matchCount !== 1) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'oneOf',
          `value must match exactly one schema; matched ${matchCount}`,
        ),
      );
    }
  }

  if (schema.not !== undefined) {
    const notErrors = validateSubschema(
      schema.not,
      value,
      context.instancePath,
      appendJsonPointer(context.schemaPath, 'not'),
    );
    if (notErrors.length === 0) {
      errors.push(
        issue(context.instancePath, context.schemaPath, 'not', 'value matches forbidden schema'),
      );
    }
  }

  if (schema.if !== undefined) {
    const conditionMatches =
      validateSubschema(
        schema.if,
        value,
        context.instancePath,
        appendJsonPointer(context.schemaPath, 'if'),
      ).length === 0;
    if (conditionMatches && schema.then !== undefined) {
      errors.push(
        ...validateSubschema(
          schema.then,
          value,
          context.instancePath,
          appendJsonPointer(context.schemaPath, 'then'),
        ),
      );
    }
    if (!conditionMatches && schema.else !== undefined) {
      errors.push(
        ...validateSubschema(
          schema.else,
          value,
          context.instancePath,
          appendJsonPointer(context.schemaPath, 'else'),
        ),
      );
    }
  }

  if (schema.const !== undefined && !isDeepStrictEqual(value, schema.const)) {
    errors.push(
      issue(
        context.instancePath,
        context.schemaPath,
        'const',
        `value must equal ${JSON.stringify(schema.const)}`,
      ),
    );
  }

  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum) || schema.enum.length === 0) {
      throw new JsonSchemaDefinitionError(
        `enum at #${context.schemaPath} must be a non-empty array`,
      );
    }
    if (!schema.enum.some((candidate) => isDeepStrictEqual(value, candidate))) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'enum',
          `value must equal one of ${JSON.stringify(schema.enum)}`,
        ),
      );
    }
  }

  if (schema.type !== undefined) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (
      expectedTypes.length === 0 ||
      !expectedTypes.every((expectedType) => typeof expectedType === 'string')
    ) {
      throw new JsonSchemaDefinitionError(
        `type at #${context.schemaPath} must be a string or non-empty string array`,
      );
    }
    if (!expectedTypes.some((expectedType) => matchesType(value, expectedType))) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'type',
          `expected ${expectedTypes.join(' or ')}, received ${valueType(value)}`,
        ),
      );
      return errors;
    }
  }

  if (typeof value === 'string') {
    const characterLength = [...value].length;
    if (schema.minLength !== undefined && characterLength < schema.minLength) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'minLength',
          `string length ${characterLength} is below ${schema.minLength}`,
        ),
      );
    }
    if (schema.maxLength !== undefined && characterLength > schema.maxLength) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'maxLength',
          `string length ${characterLength} exceeds ${schema.maxLength}`,
        ),
      );
    }
    if (schema.pattern !== undefined) {
      if (typeof schema.pattern !== 'string') {
        throw new JsonSchemaDefinitionError(`pattern at #${context.schemaPath} must be a string`);
      }
      let expression;
      try {
        expression = new RegExp(schema.pattern, 'u');
      } catch (error) {
        throw new JsonSchemaDefinitionError(
          `Invalid pattern at #${context.schemaPath}: ${error.message}`,
        );
      }
      if (!expression.test(value)) {
        errors.push(
          issue(
            context.instancePath,
            context.schemaPath,
            'pattern',
            `string does not match ${schema.pattern}`,
          ),
        );
      }
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'minimum',
          `number ${value} is below ${schema.minimum}`,
        ),
      );
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'maximum',
          `number ${value} exceeds ${schema.maximum}`,
        ),
      );
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'exclusiveMinimum',
          `number ${value} must be greater than ${schema.exclusiveMinimum}`,
        ),
      );
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'exclusiveMaximum',
          `number ${value} must be less than ${schema.exclusiveMaximum}`,
        ),
      );
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'minItems',
          `array length ${value.length} is below ${schema.minItems}`,
        ),
      );
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'maxItems',
          `array length ${value.length} exceeds ${schema.maxItems}`,
        ),
      );
    }
    if (
      schema.uniqueItems === true &&
      value.some((candidate, index) =>
        value.slice(0, index).some((previous) => isDeepStrictEqual(previous, candidate)),
      )
    ) {
      errors.push(
        issue(
          context.instancePath,
          context.schemaPath,
          'uniqueItems',
          'array items must be unique',
        ),
      );
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) => {
        errors.push(
          ...validateSubschema(
            schema.items,
            item,
            appendJsonPointer(context.instancePath, index),
            appendJsonPointer(context.schemaPath, 'items'),
          ),
        );
      });
    }
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
      throw new JsonSchemaDefinitionError(`properties at #${context.schemaPath} must be an object`);
    }

    if (schema.required !== undefined) {
      if (
        !Array.isArray(schema.required) ||
        !schema.required.every((property) => typeof property === 'string')
      ) {
        throw new JsonSchemaDefinitionError(
          `required at #${context.schemaPath} must be a string array`,
        );
      }
      for (const requiredProperty of schema.required) {
        if (!Object.hasOwn(value, requiredProperty)) {
          errors.push(
            issue(
              context.instancePath,
              context.schemaPath,
              'required',
              `missing required property ${JSON.stringify(requiredProperty)}`,
            ),
          );
        }
      }
    }

    for (const [property, propertySchema] of Object.entries(properties)) {
      if (!Object.hasOwn(value, property)) continue;
      errors.push(
        ...validateSubschema(
          propertySchema,
          value[property],
          appendJsonPointer(context.instancePath, property),
          appendJsonPointer(appendJsonPointer(context.schemaPath, 'properties'), property),
        ),
      );
    }

    const patternProperties = schema.patternProperties ?? {};
    if (
      typeof patternProperties !== 'object' ||
      patternProperties === null ||
      Array.isArray(patternProperties)
    ) {
      throw new JsonSchemaDefinitionError(
        `patternProperties at #${context.schemaPath} must be an object`,
      );
    }
    const compiledPatterns = Object.entries(patternProperties).map(([pattern, propertySchema]) => {
      try {
        return { expression: new RegExp(pattern, 'u'), pattern, propertySchema };
      } catch (error) {
        throw new JsonSchemaDefinitionError(
          `Invalid patternProperties pattern at #${context.schemaPath}: ${error.message}`,
        );
      }
    });

    for (const [property, propertyValue] of Object.entries(value)) {
      const matchingPatterns = compiledPatterns.filter(({ expression }) =>
        expression.test(property),
      );
      for (const { pattern, propertySchema } of matchingPatterns) {
        errors.push(
          ...validateSubschema(
            propertySchema,
            propertyValue,
            appendJsonPointer(context.instancePath, property),
            appendJsonPointer(appendJsonPointer(context.schemaPath, 'patternProperties'), pattern),
          ),
        );
      }

      const isDeclared = Object.hasOwn(properties, property) || matchingPatterns.length > 0;
      if (isDeclared || schema.additionalProperties === undefined) continue;
      if (schema.additionalProperties === false) {
        errors.push(
          issue(
            appendJsonPointer(context.instancePath, property),
            context.schemaPath,
            'additionalProperties',
            `additional property ${JSON.stringify(property)} is not allowed`,
          ),
        );
      } else if (schema.additionalProperties !== true) {
        errors.push(
          ...validateSubschema(
            schema.additionalProperties,
            propertyValue,
            appendJsonPointer(context.instancePath, property),
            appendJsonPointer(context.schemaPath, 'additionalProperties'),
          ),
        );
      }
    }
  }

  return errors;
}

export function validateJsonSchema(schema, value) {
  return validateNode(schema, value, {
    rootSchema: schema,
    instancePath: '',
    schemaPath: '',
  });
}

export function formatSchemaViolations(label, violations) {
  return violations
    .map(
      ({ instancePath, schemaPath, message }) =>
        `${label}${instancePath || '/'} (${schemaPath ? `#${schemaPath}` : '#'}): ${message}`,
    )
    .join('\n');
}

export function assertJsonSchema(schema, value, label = 'JSON value') {
  const violations = validateJsonSchema(schema, value);
  if (violations.length > 0) {
    throw new Error(formatSchemaViolations(label, violations));
  }
}

export function verifyTraditionPackSchemaSelfChecks(schema, validManifest) {
  const cloneManifest = () => JSON.parse(JSON.stringify(validManifest));

  const missingDisplayName = cloneManifest();
  delete missingDisplayName.displayName;
  assert.ok(
    validateJsonSchema(schema, missingDisplayName).some(
      ({ keyword, message }) => keyword === 'required' && message.includes('"displayName"'),
    ),
    'Tradition Pack schema did not reject a missing displayName',
  );

  const extraProperty = cloneManifest();
  extraProperty.unrecognizedField = true;
  assert.ok(
    validateJsonSchema(schema, extraProperty).some(
      ({ keyword, instancePath }) =>
        keyword === 'additionalProperties' && instancePath === '/unrecognizedField',
    ),
    'Tradition Pack schema did not reject an extra manifest property',
  );

  const absoluteResourcePath = cloneManifest();
  absoluteResourcePath.runtime.profileModule = '/tmp/profile.ts';
  assert.ok(
    validateJsonSchema(schema, absoluteResourcePath).some(
      ({ keyword, instancePath }) =>
        keyword === 'pattern' && instancePath === '/runtime/profileModule',
    ),
    'Tradition Pack schema did not reject an absolute resource path',
  );
}

export function verifyTraditionPackSchemas({ projectRoot = defaultProjectRoot } = {}) {
  const packRoot = join(projectRoot, 'plugins/oh-my-saju/tradition-packs');
  const schemaPath = join(packRoot, 'tradition-pack.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const manifests = readdirSync(packRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = join(packRoot, entry.name, 'tradition-pack.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      assertJsonSchema(schema, manifest, manifestPath);
      return { manifest, manifestPath };
    });

  assert.ok(manifests.length > 0, 'No Tradition Pack manifests were found');
  verifyTraditionPackSchemaSelfChecks(schema, manifests[0].manifest);
  return { manifests, schema, schemaPath };
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  try {
    const result = verifyTraditionPackSchemas();
    console.log(
      `Tradition Pack schema verification passed (${result.manifests.length} manifests + 3 negative self-checks).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
