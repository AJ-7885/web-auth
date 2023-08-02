import { rest } from 'msw'
// 🐨 bring in setupServer from 'msw/node'
import closeWithGrace from 'close-with-grace'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handlers = [
	process.env.REMIX_DEV_HTTP_ORIGIN
		? rest.post(`${process.env.REMIX_DEV_HTTP_ORIGIN}ping`, req =>
				req.passthrough(),
		  )
		: null,

	// 🐨 add a post handler for the resend API endpoint:
	// https://api.resend.com/emails

	// 🐨 get the body from req.json()
	// 🐨 log the body to the console
	// 🐨 return a response with a JSON object that has an id, from, to, and created_at
	// 💰 for the id and created_at you can use faker.string.uuid() and new Date().toISOString()
].filter(Boolean)

// 🐨 call setupServer with the handlers here

// 🐨 call server.listen with an onUnhandledRequest of 'warn'
console.info('🔶 Mock server installed')

closeWithGrace(() => {
	// 🐨 call server.close here
})
