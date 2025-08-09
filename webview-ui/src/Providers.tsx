import { type ReactNode } from "react"

import { ExtensionStateContextProvider } from "./context/ExtensionStateContext"
import { VSCodeThemeProvider } from "./components/ui/VSCodeThemeProvider"

export function Providers({ children }: { children: ReactNode }) {
	return (
		<ExtensionStateContextProvider>
			<VSCodeThemeProvider>{children}</VSCodeThemeProvider>
		</ExtensionStateContextProvider>
	)
}
