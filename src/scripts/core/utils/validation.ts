export const MCPP_ID_REGEX = /^mcpp:[a-z0-9_]+$/;

export function isValidId(id: string): boolean {
  return MCPP_ID_REGEX.test(id);
}

export function assertValidId(id: string, context: string): void {
  if (!isValidId(id)) throw new Error(`Invalid id "${id}" (${context}) — phai khop ^mcpp:[a-z0-9_]+$`);
}
