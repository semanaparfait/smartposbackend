import { TransformFnParams } from 'class-transformer';

// Multipart forms send every value as text, and JSON clients may send null to
// clear a field. These run before validation; anything unrecognised is passed on
// unchanged so the validators reject it.

export const toBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

// A blank field means "not sent". (@Type(() => Number) would turn it into 0.)
export const toNumber = ({ value }: TransformFnParams): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

// For nullable numbers: a blank field or null clears the value.
export const toNumberOrNull = ({ value }: TransformFnParams): unknown => {
  if (value === undefined) return undefined;
  return value === '' || value === null ? null : Number(value);
};

// For nullable text: a blank field clears the value.
export const blankToNull = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? null : value.trim();
};
