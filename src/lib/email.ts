import nodemailer from 'nodemailer'

// Create reusable transporter object
const createTransporter = () => {
  // Option 1: Gmail SMTP
  // if (process.env.EMAIL_SERVER_HOST === 'smtp.gmail.com') {
  //   return nodemailer.createTransporter({
  //     host: process.env.EMAIL_SERVER_HOST,
  //     port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  //     secure: false, // true for 465, false for other ports
  //     auth: {
  //       user: process.env.EMAIL_SERVER_USER,
  //       pass: process.env.EMAIL_SERVER_PASSWORD,
  //     },
  //   })
  // }

  // Option 2: SendGrid
  // if (process.env.SENDGRID_API_KEY) {
  //   return nodemailer.createTransporter({
  //     service: 'SendGrid',
  //     auth: {
  //       user: 'apikey',
  //       pass: process.env.SENDGRID_API_KEY,
  //     },
  //   })
  // }

  // Option 3: Resend
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  throw new Error('No email service configured')
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error: error.message }
  }
}

// Email Templates
export const emailTemplates = {
  verificationEmail: (name: string, verificationUrl: string) => ({
    subject: 'Verify your email address',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Welcome to MyApp!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering with MyApp. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't create an account with MyApp, you can safely ignore this email.
        </p>
      </div>
    `,
  }),

  resetPasswordEmail: (name: string, resetUrl: string) => ({
    subject: 'Reset your password',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You recently requested to reset your password for your MyApp account. Click the button below to reset it.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This password reset link will expire in 1 hour for security reasons.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
    `,
  }),
}