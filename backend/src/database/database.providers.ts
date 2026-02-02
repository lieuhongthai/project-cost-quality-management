import { Sequelize } from "sequelize-typescript";
import { Project } from "../modules/project/project.model";
import { Phase } from "../modules/phase/phase.model";
import { Effort } from "../modules/effort/effort.model";
import { Testing } from "../modules/testing/testing.model";
import { Report } from "../modules/report/report.model";
import { Commentary } from "../modules/commentary/commentary.model";
import { ProjectSettings } from "../modules/project/project-settings.model";
import { Metrics } from "../modules/metrics/metrics.model";
import { ScreenFunction } from "../modules/screen-function/screen-function.model";
import { PhaseScreenFunction } from "../modules/screen-function/phase-screen-function.model";
import { Member } from "../modules/member/member.model";
import { Review } from "../modules/review/review.model";
import { Permission } from "../modules/iam/permission.model";
import { Role } from "../modules/iam/role.model";
import { RolePermission } from "../modules/iam/role-permission.model";
import { Position } from "../modules/iam/position.model";
import { PositionRole } from "../modules/iam/position-role.model";
import { User } from "../modules/iam/user.model";
import { EmailQueue } from "../modules/iam/email-queue.model";
import { WorkflowStage } from "../modules/task-workflow/workflow-stage.model";
import { WorkflowStep } from "../modules/task-workflow/workflow-step.model";
import { TaskWorkflow } from "../modules/task-workflow/task-workflow.model";
import { StepScreenFunction } from "../modules/task-workflow/step-screen-function.model";
import { StepScreenFunctionMember } from "../modules/task-workflow/step-screen-function-member.model";

export const databaseProviders = [
  {
    provide: "SEQUELIZE",
    useFactory: async () => {
      console.log(
        `Connecting to database at ${process.env.DB_HOST || "localhost"}:${
          process.env.DB_PORT || "5432"
        }`
      );

      const sequelize = new Sequelize({
        dialect: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "project_cost_quality",
        dialectOptions: process.env.DB_SSL === "true" ? {
          ssl: {
            require: true,
            rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === "true",
          },
        } : {},
        logging: false,
      });

      sequelize.addModels([
        Project,
        Phase,
        Effort,
        Testing,
        Report,
        Commentary,
        ProjectSettings,
        Metrics,
        ScreenFunction,
        PhaseScreenFunction,
        Member,
        Review,
        Permission,
        Role,
        RolePermission,
        Position,
        PositionRole,
        User,
        EmailQueue,
        WorkflowStage,
        WorkflowStep,
        TaskWorkflow,
        StepScreenFunction,
        StepScreenFunctionMember,
      ]);

      await sequelize.sync({alter: true });
      return sequelize;
    },
  },
];
