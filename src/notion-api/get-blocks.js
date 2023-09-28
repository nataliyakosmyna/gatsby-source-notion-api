const fetch = require("node-fetch")
const { errorMessage } = require("../error-message")

exports.getBlocks = async ({ id, notionVersion, token }, reporter) => {
	let hasMore = true
	let blockContent = []
	let startCursor = ""

	while (hasMore) {
		let url = `https://api.notion.com/v1/blocks/${id}/children`

		if (startCursor) {
			url += `?start_cursor=${startCursor}`
		}

		let result = {}
		try {
			const raw = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					"Notion-Version": notionVersion,
					Authorization: `Bearer ${token}`,
				},
			})
			const text = await raw.text()
			result = JSON.parse(text)

			for (let childBlock of result.results) {
				if (childBlock.has_children) {
					childBlock.children = await this.getBlocks(
						{ id: childBlock.id, notionVersion, token },
						reporter,
					)
				}
			}

			blockContent = blockContent.concat(result.results)
			startCursor = result.next_cursor
			hasMore = result.has_more
		} catch (e) {
			console.error("@attentivu/gatsby-source-notion-api", e, result)
			reporter.panic(errorMessage)
		}
	}

	return blockContent
}
