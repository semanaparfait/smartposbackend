import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloud_name: String(process.env.CLOUD_NAME),
  api_key: String(process.env.API_KEY),
  api_secret: String(process.env.API_SECRET),
}));
