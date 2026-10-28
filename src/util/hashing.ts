import * as bcrypt from 'bcrypt';

// Async bcrypt runs on the thread pool; the *Sync versions would block every other
// request while a PIN is checked against a whole company's employees.
export const hashContent = async (content: string) => {
  return bcrypt.hash(content, 10);
};

export const compareHashContent = async (
  content: string,
  hashedContent: string,
) => {
  return bcrypt.compare(content, hashedContent);
};
