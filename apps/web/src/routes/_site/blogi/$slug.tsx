import { mediaUrl } from "@koirankoulutus/api/format";
import { docText, type RichTextDoc } from "@koirankoulutus/api/rich-text";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PostArticle } from "@/components/post-article";

export const Route = createFileRoute("/_site/blogi/$slug")({
	component: PostPage,
	loader: async ({ context: { queryClient, trpc }, params }) => {
		const post = await queryClient.ensureQueryData(
			trpc.posts.get.queryOptions({ slug: params.slug }),
		);
		if (!post) throw notFound();
		return post;
	},
	head: ({ loaderData: post }) => {
		if (!post) return {};
		const description = post.excerpt || docText(post.body as RichTextDoc);
		const image = post.coverKey
			? `${location.origin}${mediaUrl(post.coverKey)}`
			: undefined;
		return {
			meta: [
				{ title: `${post.title} | koirankoulutus Nyt ja Tässä` },
				{ name: "description", content: description },
				{ property: "og:type", content: "article" },
				{ property: "og:title", content: post.title },
				{ property: "og:description", content: description },
				...(image ? [{ property: "og:image", content: image }] : []),
			],
		};
	},
});

function PostPage() {
	const post = Route.useLoaderData();
	return <PostArticle post={{ ...post, body: post.body as RichTextDoc }} />;
}
