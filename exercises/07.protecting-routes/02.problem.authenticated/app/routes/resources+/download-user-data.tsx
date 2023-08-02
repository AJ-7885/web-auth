import { json, type DataFunctionArgs } from '@remix-run/node'
import { prisma } from '~/utils/db.server.ts'
import { getDomainUrl } from '~/utils/misc.tsx'

export async function loader({ request }: DataFunctionArgs) {
	const userId = 'some_user_id' // 🐨 get the user with your requireUserId util
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		// this is one of the *few* instances where you can use "include" because
		// the goal is to literally get *everything*. Normally you should be
		// explicit with "select". We're suing select for images because we don't
		// want to send back the entire blob of the image. We'll send a URL they can
		// use to download it instead.
		include: {
			image: {
				select: {
					id: true,
					createdAt: true,
					updatedAt: true,
					contentType: true,
				},
			},
			notes: {
				include: {
					images: {
						select: {
							id: true,
							createdAt: true,
							updatedAt: true,
							contentType: true,
						},
					},
				},
			},
			password: false, // <-- intentionally omit password
		},
	})

	const domain = getDomainUrl(request)

	return json({
		user: {
			...user,
			image: user.image
				? {
						...user.image,
						url: `${domain}/resources/user-images/${user.image.id}`,
				  }
				: null,
			notes: user.notes.map(note => ({
				...note,
				images: note.images.map(image => ({
					...image,
					url: `${domain}/resources/note-images/${image.id}`,
				})),
			})),
		},
	})
}