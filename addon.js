const { addonBuilder } = require("stremio-addon-sdk")
const { google } = require('googleapis')
const youtube_api_key = process.env.YOUTUBE_API_KEY
const youtube = google.youtube({
	version: 'v3',
	auth: youtube_api_key
})

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = require('./manifest.json')
const builder = new addonBuilder(manifest)

builder.defineCatalogHandler(async ({ type, id, extra }) => {
	console.log("request for catalogs: " + type + " " + id)
	console.log(extra)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineCatalogHandler.md
	if (type == 'channel') {
		// Get search query
		const search_query = extra.search
		// Get channels
		const res = await youtube.search.list({
			part: 'snippet',
			q: search_query,
			type: 'channel',
			maxResults: 20
		})
		const channels = res.data.items
		const metas = []
		for (let i = 0; i < channels.length; i++) {
			const channel = channels[i]
			metas.push({
				id: 'yt:' + channel.id.channelId,
				type: 'channel',
				name: channel.snippet.title,
				poster: channel.snippet.thumbnails.high.url
			})
		}
		return Promise.resolve({ metas: metas })
	} else {
		return Promise.resolve({ meta: {} })
	}
})

builder.defineMetaHandler(async ({ type, id }) => {
	console.log("request for meta: " + type + " " + id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineMetaHandler.md
	if (type == 'channel') {
		// get channel id by splitting id by :
		const channel_id = id.split(':')[1]
		const res = await youtube.channels.list({
			part: 'snippet,contentDetails',
			id: channel_id
		})
		// Get channel profile picture in png format
		const profile_pic = res.data.items[0].snippet.thumbnails.default.url
		const profile_pic_png = profile_pic.substring(0, profile_pic.length - 4) + 'png'

		const meta = {
			id: id,
			type: 'channel',
			name: res.data.items[0].snippet.title,
			description: res.data.items[0].snippet.description,
			country: res.data.items[0].snippet.country,
			// posterShape: 'square',
			// poster: res.data.items[0].snippet.thumbnails.default.url,
			// background: res.data.items[0].snippet.thumbnails.high.url,
			// logo: res.data.items[0].snippet.thumbnails.medium.url,
		}
		// Get channel videos
		const video_ids = res.data.items[0].contentDetails.relatedPlaylists.uploads
		const video_res = await youtube.playlistItems.list({
			part: 'snippet,contentDetails',
			playlistId: video_ids,
			maxResults: 20
		})
		const video_metas = []
		for (let i = 0; i < video_res.data.items.length; i++) {
			const video = video_res.data.items[i]
			video_metas.push({
				id: 'yt:' + video.contentDetails.videoId,
				title: video.snippet.title,
				released: video.snippet.publishedAt,
				thumbnail: video.snippet.thumbnails.default.url,
				overview: video.snippet.description,
				streams: [
					{ ytId: video.contentDetails.videoId }
				]
			})
		}
		console.log(video_metas)
		meta.videos = video_metas

		return Promise.resolve({ meta: meta })

	} else {
		return Promise.resolve({ meta: {} })
	}
})

builder.defineStreamHandler(({ type, id }) => {
	console.log("request for streams: " + type + " " + id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
	// return no streams
	return Promise.resolve({ streams: [] })
})

module.exports = builder.getInterface()