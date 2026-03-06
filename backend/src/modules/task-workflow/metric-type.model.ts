import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from "sequelize-typescript";
import { Project } from "../project/project.model";
import { MetricCategory } from "./metric-category.model";

// Default metric types template
export const DEFAULT_METRIC_TYPES = [
  {
    name: "Requirement",
    description: "Issues found in requirement analysis",
    displayOrder: 1,
  },
  {
    name: "Coding",
    description: "Issues found in coding",
    displayOrder: 2,
  },
  {
    name: "Functional Design",
    description: "Issues found in functional design",
    displayOrder: 3,
  },
  {
    name: "Review_TestPlant",
    description: "Issues found in test plan review",
    displayOrder: 4,
  },
  {
    name: "Review_Testcase",
    description: "Issues found in test case review",
    displayOrder: 5,
  },
  {
    name: "Test Cases",
    description: "Issues found in test case review",
    displayOrder: 5,
  },
] as const;

// Default categories for each metric type
export const DEFAULT_METRIC_CATEGORIES: Record<
  string,
  Array<{ name: string; description?: string }>
> = {
  Requirement: [
    {
      name: "In_Mô tả mập mờ",
      description:
        "Mô tả yêu cầu không rõ ràng gây hiểu nhầm cho người thực hiện",
    },
    {
      name: "In_Số liệu không rõ ràng",
      description:
        "Các số liệu, con số trong yêu cầu không được xác định rõ ràng",
    },
    {
      name: "In_Mô tả mâu thuẫn",
      description: "Mô tả yêu cầu mâu thuẫn với các yêu cầu khác",
    },
    {
      name: "In_Từ chuyên môn sai",
      description: "Sử dụng sai thuật ngữ chuyên môn trong mô tả yêu cầu",
    },
    {
      name: "Ex_KH thêm mới",
      description: "Khách hàng thêm mới yêu cầu hoặc chức năng",
    },
    {
      name: "Ex_KH thay đổi",
      description: "Khách hàng thay đổi yêu cầu hoặc chức năng đã định",
    },
    {
      name: "Ex_Chưa đúng ý KH",
      description: "Kết quả thực hiện chưa đúng ý của khách hàng",
    },
  ],
  "Functional Design": [
    {
      name: "Thiếu use case / logic flow",
      description: "Thiếu hoặc không có use case và logic flow mô tả",
    },
    {
      name: "Logic xử lý mô tả không rõ ràng",
      description: "Logic xử lý được mô tả không rõ ràng, khó hiểu",
    },
    {
      name: "Không khớp với require (miss case, hiểu sai)",
      description: "Thiết kế không khớp với yêu cầu, thiếu case hoặc hiểu sai",
    },
    {
      name: "Thiết kế không khả thi khi triển khai",
      description: "Thiết kế không thể triển khai được trong thực tế",
    },
    {
      name: "Thiếu case error",
      description: "Không mô tả cách xử lý các trường hợp lỗi",
    },
    {
      name: "Flow khó hiểu, gây hiểu lầm",
      description: "Luồng xử lý phức tạp hoặc mô tả khó hiểu",
    },
    {
      name: "Require thay đổi nhưng chưa cập nhật",
      description: "Yêu cầu thay đổi nhưng thiết kế chưa được cập nhật",
    },
    {
      name: "Thiết kế không thống nhất",
      description: "Thiết kế không nhất quán giữa các phần",
    },
    {
      name: "API mô tả không đầy đủ",
      description: "Mô tả API không đầy đủ chi tiết",
    },
    {
      name: "Thiếu mô tả yêu cầu hiệu năng cho API",
      description: "Không mô tả yêu cầu hiệu năng hoặc giới hạn của API",
    },
    {
      name: "Lỗi trình bày/sao chép",
      description: "Sai sót trong trình bày hoặc lỗi sao chép",
    },
    {
      name: "Thiết kế dư thừa/ Tối ưu thiết kế",
      description: "Thiết kế có phần dư thừa hoặc cần tối ưu hóa",
    },
  ],
  Coding: [
    { name: "Lỗi logic", description: "Lỗi logic nghiệp vụ trong code" },
    {
      name: "UI/UX không khớp",
      description: "Lỗi giao diện không khớp design",
    },
    {
      name: "Data / Validation",
      description: "Lỗi xử lý dữ liệu hoặc validation",
    },
    { name: "Performance Bug", description: "Lỗi hiệu năng hoặc tối ưu" },
    { name: "Security Bug", description: "Lỗi bảo mật" },
    {
      name: "Lỗi hệ thống / môi trường",
      description: "Lỗi liên quan đến hệ thống hoặc môi trường",
    },
    {
      name: "System Crash",
      description: "Ứng dụng bị crash hoặc không hoạt động",
    },
    {
      name: "Chưa hiểu rõ yêu cầu",
      description: "Hiểu sai hoặc thiếu hiểu biết về yêu cầu",
    },
    {
      name: "Thiết kế ko rõ ràng",
      description: "Thiết kế không rõ ràng dẫn đến lỗi code",
    },
  ],
  Review_TestPlant: [
    {
      name: "Thiếu nghiệp vụ (Missing Business Logic)",
      description: "Thiếu logic nghiệp vụ hoặc case xử lý trong test plan",
    },
    {
      name: "Mô tả mập mờ/Thiếu chi tiết",
      description:
        "Mô tả test case không rõ ràng hoặc thiếu chi tiết thực hiện",
    },
    {
      name: "Thiếu độ phủ Test (Missing Test)",
      description: "Thiếu test case để kiểm thử toàn bộ yêu cầu",
    },
    {
      name: "Lỗi Trình bày/Sao chép",
      description: "Sai sót trong trình bày hoặc lỗi sao chép test case",
    },
  ],
  Review_Testcase: [
    {
      name: "Thiếu Case/Độ phủ",
      description: "Không có đủ test case để kiểm thử toàn bộ chức năng",
    },
    {
      name: "Sai Logic/Nghiệp vụ",
      description:
        "Test case không phản ánh đúng logic hoặc quy trình nghiệp vụ",
    },
    {
      name: "Sai Cấu trúc/Luồng Test",
      description: "Cấu trúc hoặc luồng thực hiện test case không hợp lý",
    },
    {
      name: "Mô tả mập mờ/Thiếu chi tiết",
      description: "Mô tả test case không rõ ràng hoặc thiếu bước chi tiết",
    },
    {
      name: "Lỗi Trình bày/Thống nhất",
      description:
        "Sai sót trình bày hoặc không thống nhất với các test case khác",
    },
  ],

  "Test Cases": [
    { name: "Total", description: "Tổng số test case" },
    { name: "Passed", description: "Số test case đạt" },
    { name: "Failed", description: "Số test case không đạt" },
  ],
};

@Table({
  tableName: "metric_types",
  timestamps: true,
})
export class MetricType extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Project)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  projectId: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  displayOrder: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @BelongsTo(() => Project, { onDelete: "CASCADE" })
  project: Project;

  @HasMany(() => MetricCategory, { onDelete: "CASCADE", hooks: true })
  categories: MetricCategory[];
}
