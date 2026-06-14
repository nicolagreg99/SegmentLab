import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`

  await transporter.sendMail({
    from:    `"SegmentLab" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Verifica il tuo account SegmentLab',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111827;">Benvenuto su SegmentLab</h2>
        <p style="color: #374151;">Clicca il link per verificare il tuo account. Il link scade tra 24 ore.</p>
        <a href="${url}" style="
          display: inline-block;
          margin-top: 16px;
          padding: 12px 24px;
          background: #2563eb;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
        ">Verifica account</a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Se non hai creato un account su SegmentLab, ignora questa email.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  await transporter.sendMail({
    from:    `"SegmentLab" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Reset password SegmentLab',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111827;">Reset password</h2>
        <p style="color: #374151;">Hai richiesto il reset della password. Il link scade tra 1 ora.</p>
        <a href="${url}" style="
          display: inline-block;
          margin-top: 16px;
          padding: 12px 24px;
          background: #2563eb;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
        ">Reset password</a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Se non hai richiesto il reset, ignora questa email. La tua password non cambierà.
        </p>
      </div>
    `,
  })
}