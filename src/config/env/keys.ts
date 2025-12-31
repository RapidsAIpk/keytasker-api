import { ConfigModule } from '@nestjs/config';

ConfigModule.forRoot();

const jwtSecret = process.env.JWT_SECRET;
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryAPIKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryAPIsecret = process.env.CLOUDINARY_API_SECRET;
// const sendgridApiKey = process.env.SENDGRID_API_KEY;


export {
  jwtSecret,
  cloudinaryAPIKey,
  cloudinaryAPIsecret,
  cloudinaryCloudName,
  // sendgridApiKey,
};
