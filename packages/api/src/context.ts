import type { Session } from "@koirankoulutus/auth";
import type { Database } from "@koirankoulutus/db";

import type { Mailer } from "./mail";
import type { Storage } from "./storage";

export type Context = {
	session: Session | null;
	db: Database;
	ip: string;
	mailer: Mailer;
	storage: Storage;
	trainerEmail: string;
	siteUrl: string;
};
