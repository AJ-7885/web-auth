import { cssBundleHref } from '@remix-run/css-bundle'
import {
	json,
	type DataFunctionArgs,
	type LinksFunction,
} from '@remix-run/node'
import {
	Link,
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useMatches,
	type V2_MetaFunction,
} from '@remix-run/react'
import os from 'node:os'
import faviconAssetUrl from './assets/favicon.svg'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { SearchBar } from './components/search-bar.tsx'
import { Button } from './components/ui/button.tsx'
import { Icon, href as iconHref } from './components/ui/icon.tsx'
import { KCDShop } from './kcdshop.tsx'
import { ThemeSwitch, useTheme } from './routes/resources+/theme/index.tsx'
import { getTheme } from './routes/resources+/theme/theme.server.ts'
import fontStylestylesheetUrl from './styles/font.css'
import tailwindStylesheetUrl from './styles/tailwind.css'
import { authenticator, getUserId } from './utils/auth.server.ts'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { getUserImgSrc } from './utils/misc.tsx'
import { useOptionalUser, useUserIsAdmin } from './utils/user.ts'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconHref, as: 'image' },
		{ rel: 'icon', type: 'image/svg+xml', href: faviconAssetUrl },
		{ rel: 'stylesheet', href: fontStylestylesheetUrl },
		{ rel: 'stylesheet', href: tailwindStylesheetUrl },
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
	].filter(Boolean)
}

export async function loader({ request }: DataFunctionArgs) {
	const userId = await getUserId(request)

	const user = userId
		? await prisma.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { id: true } },
					roles: {
						select: {
							permissions: {
								select: { id: true, name: true },
							},
						},
					},
				},
		  })
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await authenticator.logout(request, { redirectTo: '/' })
	}

	return json({
		username: os.userInfo().username,
		user,
		theme: getTheme(request),
		ENV: getEnv(),
	})
}

function Document({
	children,
	theme,
	env,
}: {
	children: React.ReactNode
	theme?: 'dark' | 'light'
	env?: Record<string, string>
}) {
	return (
		<html lang="en" className={`${theme} h-full overflow-x-hidden`}>
			<head>
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
			</head>
			<body className="flex h-full flex-col justify-between bg-background text-foreground">
				{children}
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration />
				<Scripts />
				<KCDShop />
				<LiveReload />
			</body>
		</html>
	)
}

export default function App() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const theme = useTheme()
	const matches = useMatches()
	const userIsAdmin = useUserIsAdmin()
	const isOnSearchPage = matches.find(m => m.id === 'routes/users+/index')
	return (
		<Document theme={theme} env={data.ENV}>
			<header className="container mx-auto py-6">
				<nav className="flex items-center justify-between">
					<Link to="/">
						<div className="font-light">epic</div>
						<div className="font-bold">notes</div>
					</Link>
					{isOnSearchPage ? null : (
						<div className="ml-auto max-w-sm flex-1 pr-10">
							<SearchBar status="idle" />
						</div>
					)}
					<div className="flex items-center gap-10">
						{user ? (
							<div className="flex items-center gap-2">
								<Button asChild variant="secondary">
									<Link
										to={`/users/${user.username}`}
										className="flex items-center gap-2"
									>
										<img
											className="h-8 w-8 rounded-full object-cover"
											alt={user.name ?? user.username}
											src={getUserImgSrc(user.image?.id)}
										/>
										<span className="text-body-sm font-bold">
											{user.name ?? user.username}
										</span>
									</Link>
								</Button>
								{userIsAdmin ? (
									<Button asChild variant="secondary">
										<Link to="/admin">
											<Icon name="backpack">Admin</Icon>
										</Link>
									</Button>
								) : null}
							</div>
						) : (
							<Button asChild variant="default" size="sm">
								<Link to="/login">Log In</Link>
							</Button>
						)}
					</div>
				</nav>
			</header>

			<div className="flex-1">
				<Outlet />
			</div>

			<div className="container mx-auto flex justify-between">
				<Link to="/">
					<div className="font-light">epic</div>
					<div className="font-bold">notes</div>
				</Link>
				<div className="flex gap-2 items-center">
					<p>Built with ♥️ by {data.username}</p>
					<ThemeSwitch userPreference={data.theme} />
				</div>
			</div>
			<div className="h-5" />
		</Document>
	)
}

export const meta: V2_MetaFunction = () => {
	return [
		{ title: 'Epic Notes' },
		{ name: 'description', content: `Your own captain's log` },
	]
}

export function ErrorBoundary() {
	return (
		<Document>
			<div className="flex-1">
				<GeneralErrorBoundary />
			</div>
		</Document>
	)
}
