import { createAuthClient } from "better-auth/react";

import { ENV } from "../env";

export const authClient = createAuthClient({
	baseURL: new URL("/api/auth", ENV.VITE_SERVER_URL).toString(),
});
