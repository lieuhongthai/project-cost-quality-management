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
      ]);

      await sequelize.sync({alter: true });
      return sequelize;
    },
  },
];
