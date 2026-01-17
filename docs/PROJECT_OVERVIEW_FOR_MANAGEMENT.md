# HỆ THỐNG QUẢN LÝ CHI PHÍ & CHẤT LƯỢNG DỰ ÁN

## Báo cáo Tổng quan Chức năng - Dành cho Ban Lãnh đạo

**Ngày cập nhật:** Tháng 01/2026
**Phiên bản:** 1.0
**Trạng thái:** Đã hoàn thành giai đoạn 1

---

## MỤC LỤC

1. [Mục tiêu dự án](#1-mục-tiêu-dự-án)
2. [Các chức năng đã hoàn thành](#2-các-chức-năng-đã-hoàn-thành)
3. [Giá trị kinh doanh](#3-giá-trị-kinh-doanh)
4. [Hướng phát triển tiếp theo](#4-hướng-phát-triển-tiếp-theo)
5. [Tóm tắt](#5-tóm-tắt)

---

## 1. MỤC TIÊU DỰ ÁN

Hệ thống được xây dựng nhằm giải quyết các vấn đề quan trọng trong quản lý dự án phần mềm:

| Vấn đề hiện tại | Giải pháp của hệ thống |
|-----------------|------------------------|
| Không biết dự án đang "xài" bao nhiêu tiền | **Kiểm soát chi phí real-time** - Dashboard hiển thị ngay chi phí thực tế |
| Không biết cuối cùng dự án tốn bao nhiêu | **Dự báo ngân sách (EAC)** - Hệ thống tự tính toán dự báo |
| Phát hiện vấn đề khi đã quá muộn | **Cảnh báo rủi ro sớm** - Trạng thái tự động: Tốt/Cảnh báo/Rủi ro |
| Quyết định dựa trên cảm tính | **Dữ liệu minh bạch** - Số liệu và biểu đồ trực quan |
| Mất nhiều thời gian làm báo cáo | **Báo cáo tự động** - Tạo báo cáo trong vài giây |

---

## 2. CÁC CHỨC NĂNG ĐÃ HOÀN THÀNH

### 2.1. Quản lý Dự án Tổng quan

**Mô tả:** Màn hình tổng quan giúp ban lãnh đạo nắm bắt tình hình tất cả dự án chỉ trong 30 giây.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Dashboard tổng quan | Nhìn toàn bộ portfolio dự án trong 1 màn hình |
| Trạng thái tự động | Hệ thống tự đánh giá: **Tốt** / **Cảnh báo** / **Rủi ro** |
| Theo dõi tiến độ | Biết dự án đã hoàn thành bao nhiêu % |
| So sánh Kế hoạch vs Thực tế | Nhìn ngay hiệu suất công việc |
| Xóa dự án | Dọn dẹp dự án cũ với cảnh báo an toàn |

**Ảnh chụp màn hình:** *(Đề xuất thêm screenshot)*

---

### 2.2. Quản lý Giai đoạn (Phase)

**Mô tả:** Chia dự án thành các giai đoạn để dễ theo dõi và phát hiện sớm vấn đề.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Chia dự án thành các giai đoạn | Dễ theo dõi từng bước: Thiết kế → Lập trình → Kiểm thử |
| Sắp xếp thứ tự giai đoạn | Linh hoạt điều chỉnh kế hoạch |
| Biểu đồ hiệu suất từng giai đoạn | Phát hiện giai đoạn nào đang "chậm" |
| Tab Charts | Biểu đồ trực quan cho từng phase |

**Lợi ích:** Phát hiện sớm vấn đề ở từng giai đoạn, can thiệp kịp thời trước khi quá muộn.

---

### 2.3. Quản lý Danh mục Chức năng (Screen/Function)

**Mô tả:** Liệt kê chi tiết tất cả màn hình và chức năng cần phát triển.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Liệt kê tất cả màn hình/chức năng | Biết dự án có bao nhiêu "việc cần làm" |
| Phân loại độ phức tạp | Đơn giản / Trung bình / Phức tạp |
| Đánh mức độ ưu tiên | Cao / Trung bình / Thấp |
| Gán người phụ trách | Rõ ràng ai làm gì |
| Liên kết với giai đoạn | Theo dõi tiến độ theo phase |

**Lợi ích:** Không còn tình trạng "quên" chức năng hoặc không biết ai đang làm gì.

---

### 2.4. Quản lý Nhân sự Dự án

**Mô tả:** Quản lý thành viên và phân bổ nguồn lực hợp lý.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Quản lý thành viên theo vai trò | PM, Dev, QA, Designer... đầy đủ |
| Theo dõi kinh nghiệm & kỹ năng | Gán đúng người cho đúng việc |
| Phân tích khối lượng công việc | Biết ai đang "quá tải" |
| Sao chép team từ dự án khác | Tiết kiệm thời gian setup dự án mới |
| Phân tích năng suất theo người | So sánh hiệu suất giữa các thành viên |

**Lợi ích:** Phân bổ nguồn lực hợp lý, tránh tình trạng người thì quá tải, người thì rảnh.

---

### 2.5. Theo dõi Công sức (Effort Tracking)

**Mô tả:** Ghi nhận và chuyển đổi công sức làm việc một cách chính xác.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Ghi nhận công sức theo tuần | Biết tuần này team làm được bao nhiêu |
| Chuyển đổi đơn vị tự động | Man-hour ↔ Man-day ↔ Man-month |
| Cấu hình ngày làm việc | Phù hợp chính sách công ty |
| Import ngày lễ tự động | Tính toán deadline chính xác hơn |
| Xử lý ngày nghỉ cuối tuần | Loại trừ T7, CN khi tính end date |

**Lợi ích:** Không còn tranh cãi về "đã làm bao nhiêu" - có số liệu rõ ràng.

---

### 2.6. Theo dõi Chất lượng (QA/Testing)

**Mô tả:** Đảm bảo sản phẩm đạt chất lượng trước khi bàn giao.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Ghi nhận số test case | Biết đã kiểm thử bao nhiêu |
| Tỷ lệ Pass/Fail | Đánh giá chất lượng sản phẩm |
| Đếm số lỗi (Defect) | Theo dõi tình trạng bugs |
| Mật độ lỗi (Defect Density) | Biết code có "sạch" hay không |

**Lợi ích:** Giao sản phẩm chất lượng, giảm rủi ro khách hàng phàn nàn sau bàn giao.

---

### 2.7. Chỉ số Hiệu suất EVM (Earned Value Management)

**Mô tả:** Đây là **điểm mạnh cốt lõi** của hệ thống, áp dụng chuẩn quốc tế PMI.

#### Các chỉ số cơ bản:

| Chỉ số | Tên đầy đủ | Ý nghĩa |
|--------|-----------|---------|
| **BAC** | Budget at Completion | Tổng ngân sách dự kiến ban đầu |
| **PV** | Planned Value | Giá trị công việc đã lên kế hoạch |
| **EV** | Earned Value | Giá trị công việc đã hoàn thành |
| **AC** | Actual Cost | Chi phí thực tế đã bỏ ra |

#### Các chỉ số hiệu suất:

| Chỉ số | Công thức | Ý nghĩa | Ví dụ |
|--------|-----------|---------|-------|
| **SPI** | EV / PV | Hiệu suất tiến độ | SPI = 0.8 → Chậm 20% so với kế hoạch |
| **CPI** | EV / AC | Hiệu suất chi phí | CPI = 0.9 → Đang vượt 10% ngân sách |

#### Các chỉ số dự báo (Forecasting):

| Chỉ số | Công thức | Ý nghĩa |
|--------|-----------|---------|
| **EAC** | AC + (BAC - EV) / CPI | **Dự kiến tổng chi phí cuối cùng** |
| **VAC** | BAC - EAC | Chênh lệch so với ngân sách ban đầu |
| **TCPI** | (BAC - EV) / (BAC - AC) | Hiệu suất cần đạt để hoàn thành đúng ngân sách |

**Ví dụ thực tế:**
> Dự án có BAC = 100 man-month
> Hiện tại: EV = 40, AC = 50 (đã làm được 40% nhưng tốn 50 MM)
> → CPI = 40/50 = 0.8 (đang vượt 20%)
> → EAC = 50 + (100-40)/0.8 = **125 man-month**
> → VAC = 100 - 125 = **-25 man-month** (vượt 25 MM so với kế hoạch)

**Lợi ích:** Trả lời được câu hỏi quan trọng nhất: **"Dự án này cuối cùng tốn bao nhiêu tiền?"**

---

### 2.8. Báo cáo Tự động

**Mô tả:** Tạo báo cáo chuyên nghiệp trong vài giây thay vì hàng giờ.

| Loại báo cáo | Nội dung |
|--------------|----------|
| **Báo cáo Tuần** | Tiến độ tuần này, vấn đề phát sinh |
| **Báo cáo Giai đoạn** | Kết quả của 1 phase cụ thể |
| **Báo cáo Dự án** | Tổng quan toàn bộ dự án |

**Mỗi báo cáo bao gồm:**
- ✅ Tự động tính toán các chỉ số EVM
- ✅ Đánh giá sức khỏe dự án (Good/Warning/At Risk)
- ✅ Biểu đồ trực quan
- ✅ Dự báo chi phí hoàn thành
- ✅ Phân tích năng suất team
- ✅ Quick Insights - Tóm tắt nhanh tình hình
- ✅ Xóa báo cáo không cần thiết

**Lợi ích:** Tạo báo cáo trong vài giây thay vì mất hàng giờ tổng hợp Excel.

---

### 2.9. Phân tích & Nhận xét

**Mô tả:** Ghi chú và phân tích tình hình dự án.

| Chức năng | Giá trị mang lại |
|-----------|------------------|
| Nhận xét thủ công | PM/Lead ghi chú đánh giá |
| Nhận xét AI tự động | Hệ thống tự phân tích và đưa nhận định |
| Lưu lịch sử phiên bản | Theo dõi thay đổi theo thời gian |

---

### 2.10. Biểu đồ Trực quan

**Mô tả:** Hiểu tình hình dự án chỉ qua một cái nhìn.

| Loại biểu đồ | Mục đích |
|--------------|----------|
| Biểu đồ tiến độ & công sức | So sánh kế hoạch vs thực tế |
| Biểu đồ tròn phân bố trạng thái | Tỷ lệ hoàn thành/đang làm/chưa bắt đầu |
| Biểu đồ hiệu suất theo giai đoạn | Phát hiện phase nào có vấn đề |
| Biểu đồ chất lượng testing | Pass rate và defect tracking |
| Biểu đồ EVM | Chi phí và hiệu suất theo thời gian |

---

## 3. GIÁ TRỊ KINH DOANH

### 3.1. Tiết kiệm Thời gian

| Công việc | Trước đây | Với hệ thống | Tiết kiệm |
|-----------|-----------|--------------|-----------|
| Tổng hợp báo cáo tuần | 2-4 giờ | 5 phút | **~95%** |
| Kiểm tra tình trạng dự án | Họp 1 giờ | 30 giây | **~99%** |
| Tính toán dự báo ngân sách | Nửa ngày | Tự động | **100%** |
| Setup dự án mới | 1-2 ngày | 30 phút | **~90%** |
| Tìm kiếm thông tin dự án | 15-30 phút | 1 phút | **~95%** |

### 3.2. Giảm Rủi ro

| Rủi ro | Cách hệ thống giúp giảm thiểu |
|--------|-------------------------------|
| Vượt ngân sách | Cảnh báo sớm khi CPI < 1.0, dự báo EAC |
| Trễ deadline | Theo dõi SPI, delay rate, cảnh báo khi chậm tiến độ |
| Chất lượng kém | Theo dõi pass rate, defect density |
| Thiếu minh bạch | Dữ liệu real-time, báo cáo tự động |
| Quyết định sai | Ra quyết định dựa trên dữ liệu, không cảm tính |

### 3.3. ROI Ước tính

**Giả định:**
- 5 Project Manager sử dụng hệ thống
- Mỗi PM tiết kiệm 4 giờ/tuần cho việc báo cáo và tổng hợp

**Tính toán:**
```
Tiết kiệm/tuần:     5 PM × 4 giờ = 20 giờ
Tiết kiệm/tháng:    20 giờ × 4 tuần = 80 giờ
Tiết kiệm/năm:      80 giờ × 12 tháng = 960 giờ

Quy đổi (8h/ngày, 22 ngày/tháng):
960 giờ ÷ 8 ÷ 22 ≈ 5.5 man-month/năm
```

**Giá trị bổ sung khó đo lường:**
- Phát hiện sớm dự án có vấn đề → Tiết kiệm chi phí sửa chữa
- Báo cáo chuyên nghiệp → Tăng độ tin cậy với khách hàng
- Dữ liệu lịch sử → Cải thiện ước lượng dự án tương lai

---

## 4. HƯỚNG PHÁT TRIỂN TIẾP THEO

### Giai đoạn 2 - Đề xuất

| Tính năng | Giá trị kỳ vọng | Độ ưu tiên |
|-----------|-----------------|------------|
| Tích hợp Jira/Azure DevOps | Đồng bộ dữ liệu tự động, không nhập tay | Cao |
| Dashboard cho khách hàng | Khách hàng tự theo dõi, tăng độ tin cậy | Cao |
| Xuất PDF/Excel | Gửi báo cáo cho stakeholders | Trung bình |
| Mobile App | Xem báo cáo mọi lúc mọi nơi | Trung bình |
| So sánh nhiều dự án | Benchmark hiệu suất giữa các dự án | Thấp |
| Dự báo AI nâng cao | Machine learning dự đoán rủi ro | Thấp |

---

## 5. TÓM TẮT

### Những gì đã hoàn thành:

| Hạng mục | Số lượng |
|----------|----------|
| Module chức năng | 15+ |
| API endpoints | 60+ |
| Màn hình giao diện | 10+ |
| Loại biểu đồ | 6 |
| Loại báo cáo | 3 |

### Điểm nổi bật:

✅ **Chuẩn quốc tế** - Áp dụng EVM (Earned Value Management) theo PMI
✅ **Tự động hóa** - 80% công việc báo cáo được tự động hóa
✅ **Trực quan** - Biểu đồ và dashboard dễ hiểu
✅ **Dự báo** - Trả lời câu hỏi "cuối cùng tốn bao nhiêu?"
✅ **Cảnh báo sớm** - Phát hiện vấn đề trước khi quá muộn

### Thông điệp chính:

> **"Hệ thống không chỉ THEO DÕI dự án - mà còn DỰ BÁO và CẢNH BÁO SỚM để ban lãnh đạo có thể HÀNH ĐỘNG kịp thời, tiết kiệm chi phí và giảm rủi ro."**

---

## PHỤ LỤC

### A. Giải thích thuật ngữ EVM

| Thuật ngữ | Tiếng Việt | Giải thích đơn giản |
|-----------|------------|---------------------|
| BAC | Ngân sách hoàn thành | Tổng tiền dự kiến ban đầu |
| PV | Giá trị kế hoạch | Đáng lẽ đã làm được bao nhiêu |
| EV | Giá trị đạt được | Thực tế đã làm được bao nhiêu |
| AC | Chi phí thực tế | Đã tốn bao nhiêu tiền |
| SPI | Chỉ số tiến độ | >1: nhanh, <1: chậm |
| CPI | Chỉ số chi phí | >1: tiết kiệm, <1: vượt |
| EAC | Dự báo tổng chi phí | Cuối cùng sẽ tốn bao nhiêu |
| VAC | Chênh lệch dự báo | Vượt/tiết kiệm bao nhiêu |

### B. Ý nghĩa trạng thái dự án

| Trạng thái | Điều kiện | Hành động đề xuất |
|------------|-----------|-------------------|
| 🟢 **Good** | CPI ≥ 1.0 và Pass Rate ≥ 95% | Tiếp tục theo dõi |
| 🟡 **Warning** | CPI 0.83-1.0 hoặc Pass Rate 80-95% | Cần chú ý, review kế hoạch |
| 🔴 **At Risk** | CPI < 0.83 hoặc Pass Rate < 80% | Cần can thiệp ngay |

---

*Tài liệu này được tạo tự động từ hệ thống Project Cost & Quality Management*
