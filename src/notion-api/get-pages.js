const fetch = require("node-fetch")
const { errorMessage } = require("../error-message")
const { getBlocks } = require("./get-blocks")

const delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPageChildren({ page, token, notionVersion }, reporter, cache) {
	let cacheKey = `notionApiPageChildren:${page.id}:${page.last_edited_time}`

	let children = await cache.get(cacheKey)

	if (children) {
		return children
	}

	// https://developers.notion.com/reference/errors#rate-limits
	const rateLimit = 1000/3;
	children = await getBlocks({ id: page.id, token, notionVersion }, reporter)
	await delay(rateLimit) // HACKY
	await cache.set(cacheKey, children)
	return children
}

exports.getPages = async ({ token, databaseId, notionVersion = "2022-06-28" }, reporter, cache) => {
	let hasMore = true
	let startCursor = ""
	const url = `https://api.notion.com/v1/databases/${databaseId}/query`
	const body = {
		page_size: 100,
	}

	const pages = []

	while (hasMore) {
		if (startCursor) {
			body.start_cursor = startCursor
		}

		let result;
		try {
			result = await fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					"Notion-Version": notionVersion,
					Authorization: `Bearer ${token}`,
				},
			}).then((res) => res.json())

			startCursor = result.next_cursor
			hasMore = result.has_more

			for (let page of result.results) {
				page.children = await fetchPageChildren({ page, token, notionVersion }, reporter, cache)
				pages.push(page)
			}
		} catch (e) {
			console.error("@attentivu/gatsby-source-notion-api", e, result);
			reporter.panic(errorMessage)
		}
	}

	return pages
}
