import * as sgMail from '@sendgrid/mail';
import { CloudinaryResult } from '@config/constants';
// import { sendgridApiKey } from '../env/keys';
// import { adminEmail } from '../env/emails';
import { randonString } from "../constants/variables"
import * as fs from 'fs';
import { writeFile } from 'fs/promises'
import * as nodemailer from 'nodemailer';

import {
  cloudinaryAPIKey,
  cloudinaryAPIsecret,
  cloudinaryCloudName,
} from '@config/env/keys';
import { AnyObject } from '@config/type';

const adminEmail = process.env.ADMIN_EMAIL;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
// console.log("admin email is ",process.env.ADMIN_EMAIL);
if (!adminEmail) {
  throw new Error("Missing required env var: ADMIN_EMAIL");
}
// sgMail.setApiKey(sendgridApiKey);
const bcrypt = require('bcrypt');
const KJUR = require('jsrsasign');
const cloudinary = require('cloudinary').v2;
// const csvtojson = require('csvtojson');

const saltRounds = 1;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryAPIKey,
  api_secret: cloudinaryAPIsecret,
});

const encryptPassword = async (password: string) => {
  if (password) {
    let encrypt = new Promise((resolve, reject) => {
      bcrypt.hash(password, saltRounds, (error: any, hash: string) => {
        if (hash) resolve(hash);
        if (error) reject(error);
      });
    });

    return await encrypt;
  } else {
    return
  }
};
const checkPassword = async (password: string, hash: string) => {
  return bcrypt.compareSync(password, hash);
};
const pascalCaseToSentence = (str) => {
  return str.replace(/([A-Z])/g, ' $1').trim();
};
interface EnumOption<T = any> {
  value:   T;
  label:   string;
}

const enumToArray = <T extends object>(enumObj: T): EnumOption<T[keyof T]>[] => {
  const enumArray: EnumOption<T[keyof T]>[] = [];

  for (const key in enumObj) {
    if (Object.prototype.hasOwnProperty.call(enumObj, key)) {
      const element = enumObj[key as keyof T];
      enumArray.push({
        value: element,
        label: pascalCaseToSentence(String(element)),
      });
    }
  }

  return enumArray;
};

// const csvToJson = (buffer: Buffer, mimetype: string) => {
//   try {
//     return csvtojson().fromString(buffer.toString());
//   } catch (error) {
//     console.error('Error converting CSV to JSON:', error);
//     throw error;
//   }
// }

const uploadBuffer = (buffer: any, folder: string, mimetype: string) => {
  const [resource_type, format] = mimetype.split('/');

  let options: any = {
    folder,
  };

  if (resource_type == 'audio')
    options = {
      folder,
      resource_type: 'video',
      format: 'mp3',
    };
  else if (resource_type == 'video')
    options = {
      folder,
      resource_type: 'video',
      format: 'mp4',
    };
  else
    options = {
      folder,
      resource_type: 'auto',
    };

  return new Promise((resolve, reject) => {
    let cld_upload_stream = cloudinary.uploader.upload_stream(
      options,
      (error: any, result: any) => {
        if (error) reject(error);
        else if (result) {
          const cresult = result as CloudinaryResult;
          resolve(cresult);
        } else reject('Unknown errpr');
      }
    );

    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  }) as Promise<CloudinaryResult>;
};
// sendGrid mail
// const sendEmail = async (to: string, subject: string, emailContent: any) => {
//   try {
//     const message = {
//       to: to,
//       from: adminEmail,
//       subject: subject,
//       html: emailContent,
//     };
//     // const email = await sgMail.send(message);

//     console.log({ message });
//   } catch (error) {
//     console.error('error~~~>', error);
//     throw error;
//   }
// };


// nodemailer mail
const sendEmail = async (to: string, subject: string, emailContent: string) => {
  try {
    // Create a transporter using Gmail's SMTP server
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: adminEmail,
        pass: gmailAppPassword, // Replace with your Gmail app password or your email password
      },
    });

    // Define the email message options
    const mailOptions = {
      to: to,
      from: adminEmail,
      subject: subject,
      html: emailContent, // HTML content of the email
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully to ${to} with subject: ${subject}`);
    console.log(info);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const generateRandomPassword = async (length: number) => {
  const charset = randonString;
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = await Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }
  return await password;
};
const generateSignature = (
  key: string,
  secret: string,
  meetingNumber: string,
  role: number
) => {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' };

  const oPayload = {
    appKey: key,
    sdkKey: key,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, secret);
  return sdkJWT;
};
const camelToSnake = (camelCase: string) => {
  return camelCase.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};
const camealObjToSnakeObj = (camelObj: AnyObject) => {
  let snakeObj: any = {};

  for (const key in camelObj) {
    snakeObj[camelToSnake(key)] = camelObj[key];
  }

  return snakeObj;
};
const snakeToCameal = (snakeCase: string) => {
  return snakeCase.replace(/_([a-z])/g, (match, group) => group.toUpperCase());
};
const snakeObjToCamealObj = (camelObj: AnyObject) => {
  let snakeObj: any = {};

  for (const key in camelObj) {
    snakeObj[snakeToCameal(key)] = camelObj[key];
  }

  return snakeObj;
};

const writeDataToFile = async (data: string, name: string, mimetype: string) => {
  const randomName = Array(12)
    .fill(null)
    .map(() => Math.round(Math.random() * 6).toString(6))
    .join('');
  const directoryPath = `./media-files/csvFiles`;
  const filePath = `${directoryPath}/${randomName}${name}.csv`;
  try {
    await writeFile(filePath, data, 'utf8');


    const buffer = await fs.promises.readFile(filePath);


    const cloudinaryResult = await uploadBuffer(buffer, 'media', mimetype);

    return { url: cloudinaryResult.secure_url };
  } catch (error) {
    throw error;
  }

}
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};


export {
  enumToArray,
  uploadBuffer,
  checkPassword,
  encryptPassword,
  pascalCaseToSentence,
  sendEmail,
  generateRandomPassword,
  generateSignature,
  camelToSnake,
  camealObjToSnakeObj,
  snakeToCameal,
  snakeObjToCamealObj,
  writeDataToFile,
  // csvToJson,
  isEmpty
};
