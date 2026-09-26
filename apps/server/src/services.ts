import { createMailer } from "@koirankoulutus/api/mail";
import { createAuth } from "@koirankoulutus/auth";
import { createDb } from "@koirankoulutus/db";

import { ENV } from "./env.server";
import { createS3Storage } from "./storage";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
export const mailer = createMailer(ENV);
export const storage = createS3Storage(ENV);
