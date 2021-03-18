import aws from 'aws-sdk';
import crypto from 'crypto';
import fs from 'fs';

const s3 = new aws.S3({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_KEY_ID });

const awsConfig = {
	apiVersion: '2010-12-01',
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	accessSecretKey: process.env.AWS_SECRET_KEY_ID,
	region: process.env.AWS_REGION,
};

aws.config.update(awsConfig);

const params = { Bucket: process.env.AWS_S3_BUCKET, Key: process.env.AWS_ACCESS_KEY_ID, ACL: 'public-read', Body: null, Metadata: {} };

// S3 파일 업로드 처리
export const uploadS3 = (file, awsPath: string, fileStream: string) =>
	new Promise((resolve, reject) => {
		const paramsMeta = {
			...params,
			ContentType: file.mimetype,
			ContentDisposition: `attachment; filename="${encodeURIComponent(file.filename)}"`,
			Key: awsPath + file.filename,
			Body: fileStream,
		};
		s3.upload(paramsMeta, (err, result) => (err ? reject(err) : resolve(result)));
	});

// S3 파일 삭제 처리
export const removeFileS3 = (filePath: string) =>
	new Promise((resolve, reject) => {
		const splitRealFilePath = filePath.split(`${params.Bucket}/`);
		s3.deleteObject({ Bucket: params.Bucket, Key: splitRealFilePath[1] }, (err, result) => (err ? reject(err) : resolve(result)));
	});

// 파일 이름 encrypt
export const encryptFileName = async (fileName: string) => {
	const iv = crypto.randomBytes(16);
	const timeStamp = new Date().getTime();
	const cipher = crypto.createCipheriv('aes-256-cbc', process.env.ENCRYPTION_KEY, iv);
	let result = cipher.update(timeStamp + fileName, 'utf8', 'hex');
	result += cipher.final('hex');
	return result;
};

// 파일 이름 decrypt
export const decryptFileName = async (fileName: string) => {
	const iv = crypto.randomBytes(16);
	const decipher = crypto.createDecipheriv('aes-256-cbc', process.env.ENCRYPTION_KEY, iv);
	let result = decipher.update(fileName, 'hex', 'utf8');
	result += decipher.final('utf8');
	result = result.substring(13);
	return result;
};
