import * as path from "node:path";

export function isPathWithin(childPath: string, parentPath: string): boolean {
  const child = path.resolve(childPath);
  const parent = path.resolve(parentPath);
  const relative = path.relative(parent, child);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function pathsEqual(left: string, right: string): boolean {
  return isPathWithin(left, right) && isPathWithin(right, left);
}
