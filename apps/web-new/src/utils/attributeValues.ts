/**
 * Serializes array of values into a string for multiselect attributes
 * Uses JSON array format to handle values with commas
 */
export function serializeMultiselectValue(values: string[]): string {
  return JSON.stringify(values);
}

/**
 * Deserializes a multiselect value string into an array
 * Handles both JSON array format and legacy comma-separated format
 */
export function deserializeMultiselectValue(value: string): string[] {
  if (!value) return [];
  
  // Try JSON format first
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall back to comma-separated for backward compatibility
  }
  
  // Legacy comma-separated format
  return value.split(",").map(v => v.trim()).filter(v => v);
}
