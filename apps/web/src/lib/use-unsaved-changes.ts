import { useBlocker } from "@tanstack/react-router";
import { useRef } from "react";

// Warns before leaving an editor with unsaved changes (in-app navigation and closing the tab).
// Returns `allowLeave` to call right before navigating away after a successful save.
export function useUnsavedChanges(dirty: boolean) {
	const skip = useRef(false);
	useBlocker({
		shouldBlockFn: () =>
			!skip.current &&
			!window.confirm(
				"Sinulla on tallentamattomia muutoksia. Poistutaanko tallentamatta?",
			),
		enableBeforeUnload: () => dirty && !skip.current,
		disabled: !dirty,
	});
	return () => {
		skip.current = true;
	};
}
