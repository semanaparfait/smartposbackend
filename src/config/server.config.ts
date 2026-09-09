import { registerAs } from '@nestjs/config';

export default registerAs('server', () => ({
  port: process.env.PORT,
  prefix: process.env.PREFIX,
  // emp_api_url: process.env.EMS_API_URL,
  // origin: process.env.FRONTEND_SOURCE || `http://192.168.1.76:5173`,

  host: process.env.BACKEND_SOURCE,

  jwt_access: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: process.env.ACCESS_EXPIRY,
  },
  // jwt_refresh: {
  //   secret: process.env.JWT_REFRESH_SECRET,
  //   expiresIn: process.env.REFRESH_EXPIRY,
  // },
}));
