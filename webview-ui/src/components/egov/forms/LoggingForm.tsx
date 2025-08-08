import { useState, useEffect } from "react"
import {
	VSCodeButton,
	VSCodeDropdown,
	VSCodeOption,
	VSCodeTextField,
	VSCodeRadio,
	VSCodeRadioGroup,
} from "@vscode/webview-ui-toolkit/react"
import { ConfigGenerationType, ConfigFormData } from "../types/templates"
import { vscode } from "../../../utils/vscode"

interface LoggingFormProps {
	onSubmit: (data: ConfigFormData) => void
	onCancel: () => void
	loggingType?: "console" | "file" | "rollingFile"
}

const LoggingForm: React.FC<LoggingFormProps> = ({ onSubmit, onCancel, loggingType = "console" }) => {
	const getDefaultFileName = (type: ConfigGenerationType) => {
		switch (loggingType) {
			case "console":
				return type === ConfigGenerationType.XML ? "logback-console" : "EgovLoggingConsoleConfig"
			case "file":
				return type === ConfigGenerationType.XML ? "logback-file" : "EgovLoggingFileConfig"
			case "rollingFile":
				return type === ConfigGenerationType.XML ? "logback-rollingFile" : "EgovLoggingRollingFileConfig"
			default:
				return "logback-console"
		}
	}

	const [formData, setFormData] = useState({
		generationType: ConfigGenerationType.XML,
		txtFileName: getDefaultFileName(ConfigGenerationType.XML),
		txtAppenderName: "CONSOLE",
		txtLevel: "INFO",
		txtPattern: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n",
		txtLoggerName: "egovframework",
		txtLoggerLevel: "DEBUG",
	})
	const [selectedOutputFolder, setSelectedOutputFolder] = useState<string | null>(null)
	const [pendingFormData, setPendingFormData] = useState<ConfigFormData | null>(null)

	// Message listener for folder selection response
	useEffect(() => {
		console.log("LoggingForm: Setting up message listener")

		const handleMessage = (event: any) => {
			console.log("LoggingForm: Received message:", event.data)
			const message = event.data
			if (message.type === "selectedOutputFolder") {
				console.log("LoggingForm: Received selectedOutputFolder:", message.text)
				setSelectedOutputFolder(message.text)
				// If we have pending form data, submit it now
				if (pendingFormData) {
					console.log("LoggingForm: Submitting with pending data:", pendingFormData)
					onSubmit({
						...pendingFormData,
						outputFolder: message.text,
					})
					setPendingFormData(null)
				} else {
					console.log("LoggingForm: No pending form data")
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			console.log("LoggingForm: Cleaning up message listener")
			window.removeEventListener("message", handleMessage)
		}
	}, [pendingFormData, onSubmit])

	const handleGenerationTypeChange = (type: ConfigGenerationType) => {
		setFormData((prev) => ({
			...prev,
			generationType: type,
			txtFileName: getDefaultFileName(type),
		}))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		console.log("LoggingForm handleSubmit called")
		console.log("Form data:", formData)

		// Validate required fields
		const requiredFields = [
			{ field: "txtFileName" as keyof typeof formData, label: "File Name" },
			{ field: "txtAppenderName" as keyof typeof formData, label: "Appender Name" },
			{ field: "txtPattern" as keyof typeof formData, label: "Log Pattern" },
		]

		const missingFields = requiredFields.filter(({ field }) => !formData[field]?.trim())

		if (missingFields.length > 0) {
			const fieldNames = missingFields.map(({ label }) => label).join(", ")
			alert(`Please fill in the following required fields: ${fieldNames}`)
			return
		}

		// Check if vscode API is available
		if (!vscode) {
			console.error("VSCode API is not available")
			return
		}

		// Store form data and request folder selection
		setPendingFormData(formData)
		console.log("Pending form data set:", formData)
		console.log("Requesting folder selection...")

		try {
			vscode.postMessage({
				type: "selectOutputFolder",
			})
			console.log("Message sent successfully")
		} catch (error) {
			console.error("Error sending message:", error)
		}
	}

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
	}

	const getFormTitle = () => {
		switch (loggingType) {
			case "console":
				return "Create Console Appender"
			case "file":
				return "Create File Appender"
			case "rollingFile":
				return "Create Rolling File Appender"
			default:
				return "Create Logging Configuration"
		}
	}

	return (
		<div style={{ padding: "20px", maxWidth: "600px" }}>
			<h2 style={{ color: "var(--vscode-foreground)", marginBottom: "20px" }}>{getFormTitle()}</h2>

			<form onSubmit={handleSubmit}>
				<div style={{ marginBottom: "20px" }}>
					<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Generation Type</h3>
					<VSCodeRadioGroup
						orientation="horizontal"
						value={formData.generationType}
						onChange={(e: any) => handleGenerationTypeChange(e.target.value as ConfigGenerationType)}>
						<VSCodeRadio value={ConfigGenerationType.XML}>XML</VSCodeRadio>
						<VSCodeRadio value={ConfigGenerationType.YAML}>YAML</VSCodeRadio>
						<VSCodeRadio value={ConfigGenerationType.PROPERTIES}>Properties</VSCodeRadio>
					</VSCodeRadioGroup>
				</div>

				<div style={{ marginBottom: "20px" }}>
					<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Generation File</h3>
					<VSCodeTextField
						value={formData.txtFileName}
						placeholder="Enter file name"
						onInput={(e: any) => handleInputChange("txtFileName", e.target.value)}
						style={{ width: "100%" }}
						required>
						File Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
					</VSCodeTextField>
				</div>

				<div style={{ marginBottom: "20px" }}>
					<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Configuration</h3>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtAppenderName}
							placeholder="Enter appender name"
							onInput={(e: any) => handleInputChange("txtAppenderName", e.target.value)}
							style={{ width: "100%" }}
							required>
							Appender Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Log Level
						</label>
						<VSCodeDropdown
							value={formData.txtLevel}
							onInput={(e: any) => handleInputChange("txtLevel", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="TRACE">TRACE</VSCodeOption>
							<VSCodeOption value="DEBUG">DEBUG</VSCodeOption>
							<VSCodeOption value="INFO">INFO</VSCodeOption>
							<VSCodeOption value="WARN">WARN</VSCodeOption>
							<VSCodeOption value="ERROR">ERROR</VSCodeOption>
						</VSCodeDropdown>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtPattern}
							placeholder="Enter log pattern"
							onInput={(e: any) => handleInputChange("txtPattern", e.target.value)}
							style={{ width: "100%" }}
							required>
							Log Pattern <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtLoggerName}
							placeholder="Enter logger name"
							onInput={(e: any) => handleInputChange("txtLoggerName", e.target.value)}
							style={{ width: "100%" }}>
							Logger Name
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "20px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Logger Level
						</label>
						<VSCodeDropdown
							value={formData.txtLoggerLevel}
							onInput={(e: any) => handleInputChange("txtLoggerLevel", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="TRACE">TRACE</VSCodeOption>
							<VSCodeOption value="DEBUG">DEBUG</VSCodeOption>
							<VSCodeOption value="INFO">INFO</VSCodeOption>
							<VSCodeOption value="WARN">WARN</VSCodeOption>
							<VSCodeOption value="ERROR">ERROR</VSCodeOption>
						</VSCodeDropdown>
					</div>
				</div>

				<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
					<VSCodeButton appearance="secondary" onClick={onCancel}>
						Cancel
					</VSCodeButton>
					<VSCodeButton type="submit" appearance="primary">
						Generate
					</VSCodeButton>
				</div>
			</form>
		</div>
	)
}

export default LoggingForm
