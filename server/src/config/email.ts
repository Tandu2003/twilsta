import nodemailer from 'nodemailer';
import { config } from './database';
import logger from '../utils/logger';

// Create nodemailer transporter
export const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};

// Email service class
export class EmailService {
  private static transporter = createEmailTransporter();

  // Send email
  static async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Twilsta" <${config.email.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  // Send verification email
  static async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #333; text-align: center;">Welcome to Twilsta!</h1>
        <p style="color: #666; font-size: 16px;">Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <p style="color: #999; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html,
      text: `Please verify your email by clicking this link: ${verificationUrl}`,
    });
  }

  // Send password reset email
  static async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #333; text-align: center;">Password Reset</h1>
        <p style="color: #666; font-size: 16px;">You requested a password reset for your Twilsta account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #999; font-size: 14px;">This link will expire in 1 hour.</p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html,
      text: `Reset your password by clicking this link: ${resetUrl}`,
    });
  }

  // Send welcome email
  static async sendWelcomeEmail(
    email: string,
    username: string
  ): Promise<boolean> {
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #333; text-align: center;">Welcome to Twilsta, ${username}!</h1>
        <p style="color: #666; font-size: 16px;">Your email has been verified successfully. You can now start using Twilsta!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p style="color: #666; font-size: 16px;">Here are some things you can do:</p>
        <ul style="color: #666;">
          <li>Complete your profile</li>
          <li>Find and follow friends</li>
          <li>Share your first post</li>
          <li>Explore the community</li>
        </ul>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Welcome to Twilsta!',
      html,
      text: `Welcome to Twilsta, ${username}! Your account is now active.`,
    });
  }

  // Test email configuration
  static async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('✅ Email service is ready');
      return true;
    } catch (error) {
      logger.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export default EmailService;
