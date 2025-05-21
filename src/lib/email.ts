import nodemailer from 'nodemailer';

// 邮件配置（在生产环境中应该从环境变量获取）
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'your-email@example.com',
    pass: process.env.SMTP_PASS || 'your-password',
  },
};

// 创建邮件传输器
const transporter = nodemailer.createTransport(emailConfig);

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// 发送邮件
export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: emailConfig.auth.user,
      to,
      subject,
      text,
      html,
    });

    console.log('邮件发送成功:', info.messageId);
  } catch (error) {
    console.error('邮件发送失败:', error);
    throw new Error('邮件发送失败');
  }
}

// 验证邮件配置
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('邮件配置验证失败:', error);
    return false;
  }
} 