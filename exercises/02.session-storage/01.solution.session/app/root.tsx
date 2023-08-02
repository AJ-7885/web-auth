import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
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
	useFetcher,
	useFetchers,
	useLoaderData,
	useMatches,
	type V2_MetaFunction,
} from '@remix-run/react'
import os from 'node:os'
import { useEffect } from 'react'
import { Toaster, toast as showToast } from 'sonner'
import { z } from 'zod'
import faviconAssetUrl from './assets/favicon.svg'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { ErrorList } from './components/forms.tsx'
import { SearchBar } from './components/search-bar.tsx'
import { Spacer } from './components/spacer.tsx'
import { Button } from './components/ui/button.tsx'
import { Icon, href as iconHref } from './components/ui/icon.tsx'
import { KCDShop } from './kcdshop.tsx'
import fontStylestylesheetUrl from './styles/font.css'
import tailwindStylesheetUrl from './styles/tailwind.css'
import { getEnv } from './utils/env.server.ts'
import { invariantResponse } from './utils/misc.tsx'
import { getTheme, setTheme, type Theme } from './utils/theme.server.ts'

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
	return json({
		username: os.userInfo().username,
		theme: getTheme(request),
		toast: null, // you'll fix this later.
		ENV: getEnv(),
	})
}

const ThemeFormSchema = z.object({
	theme: z.enum(['light', 'dark']),
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	invariantResponse(
		formData.get('intent') === 'update-theme',
		'Invalid intent',
		{ status: 400 },
	)
	const submission = parse(formData, {
		schema: ThemeFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'success', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
	const { theme } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	return json({ success: true, submission }, responseInit)
}

function Document({
	children,
	theme,
	env,
}: {
	children: React.ReactNode
	theme?: Theme
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
				<Toaster closeButton position="top-center" />
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
	const theme = useTheme()
	const matches = useMatches()
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
						<Button asChild variant="default" size="sm">
							<Link to="/login">Log In</Link>
						</Button>
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
					<ThemeSwitch userPreference={theme} />
				</div>
			</div>
			<Spacer size="3xs" />
			{data.toast ? <ShowToast toast={data.toast} /> : null}
		</Document>
	)
}

function useTheme() {
	const data = useLoaderData<typeof loader>()
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(
		fetcher => fetcher.formData?.get('intent') === 'update-theme',
	)
	const optimisticTheme = themeFetcher?.formData?.get('theme')
	if (optimisticTheme === 'light' || optimisticTheme === 'dark') {
		return optimisticTheme
	}
	return data.theme
}

function ThemeSwitch({ userPreference }: { userPreference?: Theme }) {
	const fetcher = useFetcher<typeof action>()

	const [form] = useForm({
		id: 'theme-switch',
		lastSubmission: fetcher.data?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ThemeFormSchema })
		},
	})

	const mode = userPreference ?? 'light'
	const nextMode = mode === 'light' ? 'dark' : 'light'
	const modeLabel = {
		light: (
			<Icon name="sun">
				<span className="sr-only">Light</span>
			</Icon>
		),
		dark: (
			<Icon name="moon">
				<span className="sr-only">Dark</span>
			</Icon>
		),
	}

	return (
		<fetcher.Form method="POST" {...form.props}>
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex gap-2">
				<button
					name="intent"
					value="update-theme"
					type="submit"
					className="flex h-8 w-8 cursor-pointer items-center justify-center"
				>
					{modeLabel[mode]}
				</button>
			</div>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)
}

function ShowToast({ toast }: { toast: any }) {
	const { id, type, title, description } = toast as {
		id: string
		type: 'success' | 'message'
		title: string
		description: string
	}
	useEffect(() => {
		setTimeout(() => {
			showToast[type](title, { id, description })
		}, 0)
	}, [description, id, title, type])
	return null
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
