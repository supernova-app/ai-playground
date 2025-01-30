/**
 * Replaces template variables in a prompt with provided values.
 * @param promptTemplate - The template string containing variables in {{ var }} format.
 * @param vars - An object containing variable names as keys and their values.
 * @returns The prompt with variables replaced by their corresponding values.
 */
export function injectVarsIntoTemplate(
  promptTemplate: string,
  vars: Record<string, string> = {},
) {
  // Replace template variables ({{ var }} or {{var}}) with values from vars object
  return promptTemplate.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    // Return the value if the key exists in vars, otherwise keep the original match
    return key in vars && vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Extracts variables from a prompt template and assigns default values.
 * @param promptTemplate - The template string containing variables in {{ var }} format.
 * @param defaultVars - An object containing default values for variables.
 * @returns An object with variable names as keys and their values (or empty strings if not provided).
 */
export function extractVariablesFromTemplate(
  promptTemplate: string,
  defaultVars: Record<string, string> = {},
): Record<string, string> {
  const variableRegex = /{{\s*(\w+)\s*}}/g;
  const matches = promptTemplate.matchAll(variableRegex);
  const variables: Record<string, string> = {};

  // Collect unique variable names and assign values
  for (const match of matches) {
    const varName = match[1]!;
    variables[varName] = defaultVars[varName] || "";
  }

  return variables;
}
