export type Mail = {
	to: string;
	subject: string;
	text: string;
	replyTo?: string;
};
export type Mailer = { send(mail: Mail): Promise<void> };

// ponytail: Resend's REST API through fetch, no SDK needed for one endpoint.
export function createMailer(config: {
	RESEND_API_KEY?: string;
	MAIL_FROM: string;
}): Mailer {
	return {
		async send(mail) {
			if (!config.RESEND_API_KEY) {
				console.log(
					`\n--- email (RESEND_API_KEY not set) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n---\n`,
				);
				return;
			}
			const res = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${config.RESEND_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from: config.MAIL_FROM,
					to: [mail.to],
					subject: mail.subject,
					text: mail.text,
					reply_to: mail.replyTo,
				}),
			});
			if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
		},
	};
}
