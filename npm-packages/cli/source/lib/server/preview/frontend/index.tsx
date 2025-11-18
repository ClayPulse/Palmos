/* This folder contains temporary code to be moved to a different package in the future. */
import ReactDOM from 'react-dom/client';

// @ts-expect-error ignore ts error for now
import Main from "../../../../../src/main.tsx"

function Preview() {
	return <Main />;
}

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement,
);
root.render(<Preview />);
