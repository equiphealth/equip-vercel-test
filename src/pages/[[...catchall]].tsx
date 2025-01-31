import * as React from 'react';
import {
	ComponentRenderData,
	extractPlasmicQueryData,
	PlasmicComponent,
	PlasmicRootProvider
} from '@plasmicapp/loader-nextjs';
import {GetStaticPaths, GetStaticProps} from 'next';
import Error from 'next/error';
import {useRouter} from 'next/router';
import {PLASMIC} from '@/plasmic-init';
import {generateAllPaths, getActiveVariation, rewriteWithoutTraits,} from "@plasmicapp/loader-nextjs/edge"

/**
 * Use fetchPages() to fetch list of pages that have been created in Plasmic
 */
export const getStaticPaths: GetStaticPaths = async () => {
	const pageModules = (await PLASMIC.fetchPages()).filter(
		p => !p.path.includes("/partners")
	)
	const paths = pageModules.flatMap(page =>
		generateAllPaths(page.path).map(path => ({
			params: {
				catchall: path.substring(1).split("/"),
			},
		}))
	)

	return {
		paths: [
			...paths,
		],
		fallback: 'blocking'
	};
};

/**
 * For each page, pre-fetch the data we need to render it
 */
export const getStaticProps: GetStaticProps = async (context) => {
	const { catchall } = context.params ?? {}
	const plasmicPath = `/${(catchall as string[])?.join("/") ?? ""}`

	const { path, traits } = rewriteWithoutTraits(plasmicPath)

	const plasmicData = await PLASMIC.maybeFetchComponentData(
		path
	)

	const variation = getActiveVariation({
		splits: PLASMIC.getActiveSplits(),
		traits,
		path: plasmicPath
	});

	const externalIds = PLASMIC.getExternalVariation(variation)
	const pageMeta = plasmicData?.entryCompMetas?.[0]

	if (!pageMeta) {
		return { props: {}, notFound: true }
	}

	// Cache any component-level usePlasmicQuery() data
	// that we need to render this page
	const queryCache = await extractPlasmicQueryData(
		<PlasmicRootProvider
			loader={PLASMIC}
			prefetchedData={plasmicData}
			pageParams={pageMeta.params}
			skipCss
			skipFonts
			variation={variation}
		>
			<PlasmicComponent component={pageMeta.displayName} />
		</PlasmicRootProvider>
	)

	return {
		props: {
			plasmicData,
			queryCache,
			pageMeta,
			variation,
			externalIds,
			traits,
		},
		revalidate: 3600, // keep cache for an hour
	}
};

/**
 * Actually render the page!
 */
export default function CatchallPage(props: { plasmicData?: ComponentRenderData; queryCache?: Record<string, any>, variation?: any }) {
	const { plasmicData, queryCache, variation } = props;
	const router = useRouter();
	if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
		return <Error statusCode={404} />;
	}
	const pageMeta = plasmicData.entryCompMetas[0];
	return (
		// Pass in the data fetched in getStaticProps as prefetchedData
		<PlasmicRootProvider
			loader={PLASMIC}
			prefetchedData={plasmicData}
			prefetchedQueryData={queryCache}
			pageRoute={pageMeta.path}
			pageParams={pageMeta.params}
			pageQuery={router.query}
			variation={variation}
		>
			{
				// pageMeta.displayName contains the name of the component you fetched.
			}
			<PlasmicComponent component={pageMeta.displayName} />
		</PlasmicRootProvider>
	);
}