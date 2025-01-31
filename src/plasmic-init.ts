import {initPlasmicLoader} from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
	projects: [
		{
			id: process.env.NEXT_PUBLIC_PLASMIC_PROJECT ?? "",
			token: process.env.NEXT_PUBLIC_PLASMIC_TOKEN ?? "",
		}
	],
	// Fetches the latest revisions, whether or not they were unpublished!
	// Disable for production to ensure you render only published changes.
	preview: true,
})