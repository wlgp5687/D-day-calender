import nodeMailer from 'nodemailer';
import aws from 'aws-sdk';

const transporter = nodeMailer.createTransport({
	SES: new aws.SES({
		apiVersion: '2010-12-01',
		secretAccessKey: process.env.AWS_SES_SECRET_KEY,
		accessKeyId: process.env.AWS_SES_ACCESS_ID,
		region: process.env.AWS_SES_REGION,
	}),
});

// eslint-disable-next-line import/prefer-default-export
export const sendEmail = async (to: string, subject: string, html: string) => {
	return new Promise((resolve, reject) => {
		transporter
			.sendMail({
				from: process.env.ADMIN_EMAIL,
				to,
				subject,
				html,
			})
			.then((result) => {
				resolve(result);
			})
			.catch((err) => {
				reject(err);
			});
	});
};
