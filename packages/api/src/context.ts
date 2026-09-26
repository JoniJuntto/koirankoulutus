import type { Session } from "@koirankoulutus/auth";
import type { Database } from "@koirankoulutus/db";

import type { Mailer } from "./mail";

export type Context = {
	session: Session | null;
	db: Database;
	ip: string;
	mailer: Mailer;
	trainerEmail: string;
	siteUrl: string;
};
