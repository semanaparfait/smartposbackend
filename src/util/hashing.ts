import * as bcrypt from 'bcrypt';

export const hashContent = async (content: string) => {
  return bcrypt.hashSync(content, 10);
};

export const compareHashContent = async (
  content: string,
  hashedContent: string,
) => {
  return bcrypt.compareSync(content, hashedContent);
};
