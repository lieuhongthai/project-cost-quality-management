# Email System Implementation Guide

## Tổng quan

Hệ thống email tích hợp NodeMailer + pg-listen để gửi email tự động khi tạo user mới với password mode là "email".

## Kiến trúc hệ thống

```
User Creation (Frontend)
    ↓
IAM Service (Backend)
    ↓
Email Queue (Database) → PostgreSQL Trigger → NOTIFY
    ↓
pg-listen (Subscriber)
    ↓
Email Queue Service → Process Queue
    ↓
Email Service → NodeMailer
    ↓
SMTP / Console Log
```

## Files đã tạo/cập nhật

### Backend - New Files

1. **backend/src/modules/iam/email-queue.model.ts**
   - Database model cho email queue
   - Các trường: to, subject, body, status, errorMessage, sentAt, retryCount
   - Status: pending, sent, failed

2. **backend/src/modules/iam/email.service.ts**
   - Service gửi email qua NodeMailer
   - Development mode: Log ra console
   - Production mode: Gửi qua SMTP

3. **backend/src/modules/iam/email-queue.service.ts**
   - Service quản lý email queue
   - Tự động tạo PostgreSQL trigger
   - Sử dụng pg-listen để lắng nghe NOTIFY
   - Process queue với retry mechanism (max 3 retries)

### Backend - Modified Files

4. **backend/src/modules/iam/iam.service.ts**
   - Import EmailQueueService
   - Thêm logic gửi email khi tạo user với passwordMode='email'

5. **backend/src/modules/iam/iam.module.ts**
   - Import EmailService và EmailQueueService
   - Thêm vào providers

6. **backend/src/modules/iam/iam.providers.ts**
   - Thêm EMAIL_QUEUE_REPOSITORY provider

7. **backend/src/modules/iam/iam.dto.ts**
   - Cập nhật CreateUserDto: thêm email và passwordMode
   - Cập nhật UpdateUserDto: thêm email

8. **backend/src/modules/iam/user.model.ts**
   - Thêm column email (nullable)

9. **backend/src/database/database.providers.ts**
   - Import và thêm EmailQueue vào models

10. **backend/.env.example**
    - Thêm NODE_ENV, database config, SMTP config

11. **backend/package.json**
    - Đã cài pg-listen@^1.7.0
    - Đã cài @types/nodemailer@^7.0.5

### Frontend - Modified Files

12. **frontend/src/types/index.ts**
    - Thêm email field vào User interface

13. **frontend/src/services/api.ts**
    - Cập nhật createUser API: passwordMode thay vì password
    - Cập nhật updateUser API: thêm email

14. **frontend/src/routes/iam.tsx**
    - Thay password input bằng email input
    - Thêm radio buttons cho passwordMode (default/email)
    - Thêm cột Email vào user table
    - Validation: email required khi chọn email mode

15. **frontend/src/i18n/locales/en.json & vi.json**
    - Thêm translation keys cho email, passwordMode, etc.

## Cấu hình Environment

### Development (.env)

```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=project_cost_quality
```

**Lưu ý**: Trong development mode, email sẽ được log ra console thay vì gửi thật.

### Production (.env)

```bash
NODE_ENV=production

# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM="Project Management System" <noreply@example.com>
```

**Gmail App Password**: Nếu dùng Gmail, bạn cần tạo App Password:
1. Vào https://myaccount.google.com/security
2. Bật 2-Step Verification
3. Tạo App Password
4. Dùng password đó cho SMTP_PASSWORD

## Cách hoạt động

### 1. Tạo User với Default Password

```typescript
// Frontend gửi
{
  username: "john_doe",
  email: "john@example.com", // Optional
  positionId: 1,
  passwordMode: "default"
}

// Backend tạo password = "999999"
// User phải đổi password lần đầu login
```

### 2. Tạo User với Email Password

```typescript
// Frontend gửi
{
  username: "jane_doe",
  email: "jane@example.com", // Required!
  positionId: 2,
  passwordMode: "email"
}

// Backend:
// 1. Tạo random password (8 ký tự)
// 2. Lưu user vào DB
// 3. Add email vào queue
// 4. PostgreSQL trigger tự động NOTIFY
// 5. pg-listen nhận notification
// 6. Email Queue Service process
// 7. Email Service gửi email
```

### 3. Email Template

```
Subject: Your Account Password

Hello,

Your account has been created with the following credentials:

Username: jane_doe
Password: abc12def

For security reasons, you will be required to change your password upon your first login.

Best regards,
Project Management System
```

## Database Schema

### Table: email_queue

```sql
CREATE TABLE email_queue (
  id SERIAL PRIMARY KEY,
  to VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### PostgreSQL Trigger

```sql
CREATE OR REPLACE FUNCTION notify_new_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_email', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_insert_trigger
AFTER INSERT ON email_queue
FOR EACH ROW
EXECUTE FUNCTION notify_new_email();
```

**Lưu ý**: Trigger được tạo tự động khi EmailQueueService khởi động.

## Testing

### 1. Test trong Development

```bash
# Start backend
cd backend
npm run start:dev

# Tạo user qua UI hoặc API
# Check console log để xem email
```

Expected console output:
```
=== EMAIL (Development Mode - Not Sent) ===
To: test@example.com
Subject: Your Account Password
Body:
Hello,

Your account has been created with the following credentials:

Username: test_user
Password: abc12def
...
==========================================
```

### 2. Test trong Production

```bash
# Set NODE_ENV=production trong .env
# Configure SMTP settings
# Start backend
npm run start:prod

# Tạo user với email mode
# Check email inbox
```

### 3. Test Email Queue

```sql
-- Xem emails trong queue
SELECT * FROM email_queue ORDER BY created_at DESC;

-- Xem pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- Xem failed emails
SELECT * FROM email_queue WHERE status = 'failed';

-- Xem retry count
SELECT id, to, retry_count, error_message
FROM email_queue
WHERE status = 'failed';
```

## Troubleshooting

### 1. Email không được gửi

**Kiểm tra**:
```sql
SELECT * FROM email_queue WHERE to = 'your@email.com';
```

- Nếu status = 'pending': pg-listen có thể chưa nhận notification
- Nếu status = 'failed': Xem error_message
- Nếu retry_count >= 3: Email đã fail sau 3 lần retry

**Solution**:
```bash
# Restart backend để process lại pending emails
# EmailQueueService tự động process pending emails khi startup
```

### 2. pg-listen connection error

**Error**: "Failed to connect to database"

**Solution**:
```bash
# Check DATABASE_URL hoặc DB_* variables
# Ensure PostgreSQL is running
# Check network/firewall
```

### 3. SMTP authentication error

**Error**: "Invalid login" hoặc "Authentication failed"

**Solution**:
- Gmail: Dùng App Password, không dùng password thường
- Bật "Less secure app access" (không khuyến khích)
- Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

### 4. Email vào spam

**Solution**:
- Configure SPF, DKIM, DMARC cho domain
- Sử dụng verified email sender
- Sử dụng email service chuyên nghiệp (SendGrid, AWS SES, etc.)

## Monitoring

### Check Queue Status

```sql
-- Overall status
SELECT
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM email_queue
GROUP BY status;

-- Recent activity
SELECT
  id,
  to,
  status,
  created_at,
  sent_at,
  EXTRACT(EPOCH FROM (sent_at - created_at)) as seconds_to_send
FROM email_queue
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Backend Logs

```bash
# Watch for email-related logs
pm2 logs | grep -i email

# Or in development
npm run start:dev | grep -i email
```

## Mở rộng trong tương lai

### 1. Email Templates

Tạo nhiều loại template:
- Welcome email
- Password reset
- Account verification
- etc.

### 2. Email Service Providers

Thay thế NodeMailer bằng:
- SendGrid
- AWS SES
- Mailgun
- etc.

### 3. Background Workers

Scale bằng cách chạy nhiều workers:
```bash
# Worker 1
npm run start:prod

# Worker 2
npm run start:prod

# All workers sẽ listen cùng 'new_email' channel
# PostgreSQL tự động distribute notifications
```

### 4. Email Scheduling

Thêm field `scheduled_at` để gửi email vào thời điểm cụ thể.

### 5. Email Analytics

Track:
- Open rate
- Click rate
- Bounce rate
- etc.

## Security Notes

### 1. Sensitive Data

- **KHÔNG** log password trong production
- **KHÔNG** commit .env file
- Sử dụng environment variables

### 2. Email Validation

- Frontend: Validate email format
- Backend: Validate email format (đã có @IsEmail())

### 3. Rate Limiting

Cân nhắc thêm rate limiting để tránh spam:
- Max X emails/user/day
- Max Y emails/IP/hour
- etc.

### 4. SMTP Credentials

- Lưu trong environment variables
- Sử dụng secret management (AWS Secrets Manager, etc.)
- Rotate credentials định kỳ

## Conclusion

Hệ thống email đã được tích hợp hoàn chỉnh với các tính năng:

✅ Email queue với PostgreSQL
✅ Real-time processing với pg-listen
✅ Retry mechanism (max 3 retries)
✅ Development/Production modes
✅ NodeMailer integration
✅ Automatic database triggers
✅ User-friendly UI

Hệ thống sẵn sàng sử dụng và có thể scale trong tương lai!
