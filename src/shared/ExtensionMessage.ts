export type ExtensionMessage =
	| {
			type: "action"
			action?: "egovButtonClicked" | "chatButtonClicked" | "focusChatInput"
			tab?: any
	  }
	| {
			type: "selectedOutputPath"
			text: string
	  }
	| {
			type: "currentWorkspacePath"
			text: string
	  }
	| {
			type: "projectGenerationProgress"
			text: string
	  }
	| {
			type: "projectGenerationResult"
			success: boolean
			text: string
			projectPath?: string
			error?: string
	  }
	| {
			type: "success" | "error"
			text: string
	  }
	| {
			type: "transferDDLToCodeView"
			ddl: string
	  }
	| {
			type: "selectedOutputFolder"
			text: string
	  }
	| {
			type: "relinquishControl"
	  }
