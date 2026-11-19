import { Router } from "express";
import { attemptsRoutes } from "./attempts.route";
import { examsRoutes } from "./exams.route";
import { gradebookRoutes } from "./gradebook.route";
import { institutionRoutes } from "./institution.route";
import { mediaRoutes } from "./media.route";
import { questionBankRoutes } from "./question-bank.route";
import { usersRoutes } from "./users.route";

export const v1Routes = Router();

v1Routes.use("/users", usersRoutes);
v1Routes.use("/institution", institutionRoutes);
v1Routes.use("/media", mediaRoutes);
v1Routes.use("/question-bank", questionBankRoutes);
v1Routes.use("/exams", examsRoutes);
v1Routes.use("/attempts", attemptsRoutes);
v1Routes.use("/gradebook", gradebookRoutes);
