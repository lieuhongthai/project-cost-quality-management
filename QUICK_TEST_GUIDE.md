# Quick Test Guide - Email System

## Đã hoàn thành ✅

### Backend
- ✅ Email Queue Model (database table)
- ✅ Email Service (NodeMailer)
- ✅ Email Queue Service (pg-listen)
- ✅ PostgreSQL Trigger (auto-notify)
- ✅ IAM Service integration
- ✅ Build thành công (no compilation errors)

### Frontend
- ✅ Email field trong User form
- ✅ Password mode selection (default/email)
- ✅ Email column trong user table
- ✅ Translations (EN/VI)

## Để test hệ thống

### 1. Start Backend

```bash
cd backend
npm run start:dev
```

**Expected logs:**
```
[Nest] LOG [InstanceLoader] DatabaseModule dependencies initialized
[Nest] LOG [InstanceLoader] IamModule dependencies initialized
[EmailQueueService] Email queue trigger created successfully
[EmailQueueService] Email queue listener connected
[EmailQueueService] Processing 0 pending emails
[NestApplication] Nest application successfully started
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Test tạo User với Default Password

1. Mở http://localhost:5173
2. Login với super-admin
3. Vào Access Control → Users tab → Create New tab
4. Nhập:
   - Username: `test_user_1`
   - Email: `test1@example.com` (optional)
   - Position: Chọn một position
   - Password Mode: **Use default password (999999)** ← Chọn này
5. Click "Create user"

**Expected:**
- User được tạo thành công
- Không có email nào được gửi
- User có thể login với password `999999`

### 4. Test tạo User với Email Password

1. Vào Create New tab
2. Nhập:
   - Username: `test_user_2`
   - Email: `test2@example.com` ← **BẮT BUỘC**
   - Position: Chọn một position
   - Password Mode: **Send random password via email** ← Chọn này
3. Click "Create user"

**Expected trong Development Mode:**
- User được tạo thành công
- Backend console sẽ log email (KHÔNG gửi thật):

```
[EmailQueueService] Email added to queue: 1
[EmailQueueService] Received new email notification: 1
[EmailQueueService] Processing 1 pending emails
[EmailService] === EMAIL (Development Mode - Not Sent) ===
[EmailService] To: test2@example.com
[EmailService] Subject: Your Account Password
[EmailService] Body:
Hello,

Your account has been created with the following credentials:

Username: test_user_2
Password: abc12def

For security reasons, you will be required to change your password upon your first login.

Best regards,
Project Management System
[EmailService] ==========================================
[EmailQueueService] Email 1 sent successfully
```

### 5. Kiểm tra Database

```sql
-- Check users table
SELECT id, username, email, "mustChangePassword", "createdAt"
FROM users
ORDER BY id DESC;

-- Check email queue
SELECT id, "to", subject, status, "sentAt", "retryCount", "createdAt"
FROM email_queue
ORDER BY id DESC;
```

**Expected:**
- Users table có 2 users mới
- Email queue có 1 record với status = 'sent'

## Troubleshooting

### Backend không start

**Check:**
```bash
cd backend
npm run build
# Nếu có lỗi, sẽ hiện ở đây
```

### Email không được process

**Check database:**
```sql
SELECT * FROM email_queue WHERE status = 'pending';
```

**Restart backend:**
```bash
# Ctrl+C để stop
npm run start:dev
# EmailQueueService sẽ auto-process pending emails khi start
```

### Lỗi "Email is required when sending password via email"

- Đảm bảo đã nhập email
- Validation đang hoạt động đúng

### PostgreSQL trigger không tạo

**Manual tạo trigger:**
```sql
CREATE OR REPLACE FUNCTION notify_new_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_email', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_queue_insert_trigger ON email_queue;
CREATE TRIGGER email_queue_insert_trigger
AFTER INSERT ON email_queue
FOR EACH ROW
EXECUTE FUNCTION notify_new_email();
```

## Production Setup

### 1. Set Environment Variables

```bash
# .env
NODE_ENV=production

# SMTP Settings (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM="Project Management System" <noreply@example.com>
```

### 2. Gmail App Password

1. Vào https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Vào App passwords → Generate
4. Copy password vào SMTP_PASSWORD

### 3. Start Production

```bash
cd backend
npm run build
npm run start:prod
```

**Expected trong Production Mode:**
- Emails sẽ được gửi thật qua SMTP
- Không log email content ra console (chỉ log success/failure)

## Monitoring Commands

```bash
# Watch backend logs
cd backend
npm run start:dev | grep -i email

# Check queue status in real-time
psql -d project_cost_quality -c "SELECT status, COUNT(*) FROM email_queue GROUP BY status;"

# Watch for new emails
psql -d project_cost_quality -c "SELECT * FROM email_queue ORDER BY \"createdAt\" DESC LIMIT 10;"
```

## Next Steps

✅ Hệ thống hoàn chỉnh và sẵn sàng test
✅ Development mode đã được configure
✅ Production mode đã được document

Chỉ cần start backend + frontend và test theo hướng dẫn trên!
