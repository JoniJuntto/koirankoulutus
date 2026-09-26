import { createMailer } from "@koirankoulutus/api/mail";
import { createAuth } from "@koirankoulutus/auth";
import { createDb } from "@koirankoulutus/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
export const mailer = createMailer(ENV);
