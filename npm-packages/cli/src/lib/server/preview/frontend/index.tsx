/* This folder contains temporary code to be moved to a different package in the future. */
import React from 'react';
import ReactDOM from 'react-dom/client';

function ErrorPage({ error }: { error: unknown }) {
	const message = error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : undefined;
	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			height: '100vh',
			width: '100vw',
			fontFamily: 'monospace',
			backgroundColor: '#1a1a1a',
			color: '#ff6b6b',
			padding: '2rem',
			boxSizing: 'border-box',
		}}>
			<div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠</div>
			<h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', color: '#ff6b6b' }}>
				Rendering Error
			</h1>
			<p style={{ margin: '0 0 1.5rem', color: '#aaa', fontSize: '0.9rem' }}>
				An error occurred while rendering the preview.
			</p>
			<pre style={{
				background: '#2a2a2a',
				border: '1px solid #444',
				borderRadius: '6px',
				padding: '1rem',
				maxWidth: '100%',
				overflowX: 'auto',
				color: '#ff9999',
				fontSize: '0.85rem',
				whiteSpace: 'pre-wrap',
				wordBreak: 'break-word',
			}}>
				{message}
				{stack ? `\n\n${stack}` : ''}
			</pre>
		</div>
	);
}

class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ error: unknown }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error: unknown) {
		return { error };
	}

	override render() {
		if (this.state.error) {
			return <ErrorPage error={this.state.error} />;
		}
		return this.props.children;
	}
}

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement,
);

const PREVIEW_MODE_ERRORS = [
	"Current window's ID is not defined.",
];

function isPreviewModeError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	return PREVIEW_MODE_ERRORS.some((msg) => message.includes(msg));
}

function showPreviewModeWarning() {
	const existing = document.getElementById('__pulse_preview_warning__');
	if (existing) return;

	const banner = document.createElement('div');
	banner.id = '__pulse_preview_warning__';
	Object.assign(banner.style, {
		position: 'fixed',
		bottom: '1rem',
		right: '1rem',
		background: '#2a2000',
		border: '1px solid #665500',
		borderRadius: '8px',
		padding: '0.75rem 1rem',
		fontFamily: 'monospace',
		fontSize: '0.8rem',
		color: '#ffcc00',
		maxWidth: '320px',
		zIndex: '9999',
		lineHeight: '1.4',
	});
	banner.textContent = '⚠ Preview mode: some Pulse Editor platform APIs are not available and will not work.';
	document.body.appendChild(banner);
}

function showError(error: unknown) {
	if (isPreviewModeError(error)) {
		showPreviewModeWarning();
		return;
	}
	root.render(<ErrorPage error={error} />);
}

// Fallback: catch errors that slip past the React error boundary
// (e.g. React 18 re-throws initial-render errors as uncaught)
window.addEventListener('error', (event) => {
	showError(event.error ?? new Error(event.message));
});
window.addEventListener('unhandledrejection', (event) => {
	showError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
});

// Use dynamic import so module-level errors in main.tsx are also caught
// @ts-ignore
import("../../../../../src/main.tsx")
	.then((mod) => {
		const Main = mod.default;
		root.render(
			<ErrorBoundary>
				<Main />
			</ErrorBoundary>
		);
	})
	.catch(showError);
