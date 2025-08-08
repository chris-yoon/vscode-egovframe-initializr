import React, { useState, useEffect } from "react"
import {
	VSCodeButton,
	VSCodeTextField,
	VSCodeRadioGroup,
	VSCodeRadio,
	VSCodeDropdown,
	VSCodeOption,
} from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType, FormComponentProps } from "../types/templates"
import { vscode } from "../../../utils/vscode"

const PropertyForm: React.FC<FormComponentProps> = ({ onSubmit, onCancel, template, initialData }) => {
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-properties",
		txtPropertyServiceName: "propertiesService",
		rdoPropertyType: "Internal Properties",
		txtKey: "pageUnit",
		txtValue: "20",
		cboEncoding: "UTF-8",
		txtPropertyFile: "classpath*:/egovframework/egovProps/conf/config.properties",
		...initialData,
	})
	const [selectedOutputFolder, setSelectedOutputFolder] = useState<string | null>(null)
	const [pendingFormData, setPendingFormData] = useState<ConfigFormData | null>(null)

	// Message listener for folder selection response
	useEffect(() => {
		const handleMessage = (event: any) => {
			const message = event.data
			if (message.type === "selectedOutputFolder") {
				setSelectedOutputFolder(message.text)
				if (pendingFormData) {
					onSubmit({
						...pendingFormData,
						outputFolder: message.text,
					})
					setPendingFormData(null)
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			window.removeEventListener("message", handleMessage)
		}
	}, [pendingFormData, onSubmit])

	const getDefaultFileName = (type: ConfigGenerationType) => {
		switch (type) {
			case ConfigGenerationType.XML:
				return "context-properties"
			case ConfigGenerationType.JAVA_CONFIG:
				return "EgovPropertiesConfig"
			default:
				return "context-properties"
		}
	}

	const handleGenerationTypeChange = (type: ConfigGenerationType) => {
		setFormData((prev) => ({
			...prev,
			generationType: type,
			txtFileName: getDefaultFileName(type),
		}))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		// Validate required fields
		const requiredFields = [
			{ field: "txtFileName" as keyof typeof formData, label: "File Name" },
			{ field: "txtPropertyServiceName" as keyof typeof formData, label: "Property Service Name" },
		]

		const missingFields = requiredFields.filter(({ field }) => !formData[field]?.toString().trim())

		if (missingFields.length > 0) {
			const fieldNames = missingFields.map(({ label }) => label).join(", ")
			alert(`Please fill in the following required fields: ${fieldNames}`)
			return
		}

		if (!vscode) {
			console.error("VSCode API is not available")
			return
		}

		setPendingFormData(formData)

		try {
			vscode.postMessage({
				type: "selectOutputFolder",
			})
		} catch (error) {
			console.error("Error sending message:", error)
		}
	}

	const handleInputChange = (field: string, value: string | boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
	}

	const isInternalProperties = formData.rdoPropertyType === "Internal Properties"

	return (
		<div style={{ padding: "20px", maxWidth: "600px" }}>
			<h2 style={{ color: "var(--vscode-foreground)", marginBottom: "20px" }}>Create Property</h2>

			<form onSubmit={handleSubmit}>
				<div style={{ marginBottom: "20px" }}>
					<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Generation Type</h3>
					<VSCodeRadioGroup
						orientation="horizontal"
						value={formData.generationType}
						onChange={(e: any) => handleGenerationTypeChange(e.target.value as ConfigGenerationType)}>
						<VSCodeRadio value={ConfigGenerationType.XML}>XML</VSCodeRadio>
						<VSCodeRadio value={ConfigGenerationType.JAVA_CONFIG}>JavaConfig</VSCodeRadio>
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
							value={formData.txtPropertyServiceName}
							placeholder="Enter property service name"
							onInput={(e: any) => handleInputChange("txtPropertyServiceName", e.target.value)}
							style={{ width: "100%" }}
							required>
							Property Service Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Type <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
						</label>
						<VSCodeRadioGroup
							orientation="vertical"
							value={formData.rdoPropertyType}
							onChange={(e: any) => handleInputChange("rdoPropertyType", e.target.value)}>
							<VSCodeRadio value="Internal Properties">Internal Properties</VSCodeRadio>
							<VSCodeRadio value="External File">External File</VSCodeRadio>
						</VSCodeRadioGroup>
					</div>

					{isInternalProperties && (
						<div>
							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtKey}
									placeholder="Enter key"
									onInput={(e: any) => handleInputChange("txtKey", e.target.value)}
									style={{ width: "100%" }}>
									Key
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtValue}
									placeholder="Enter value"
									onInput={(e: any) => handleInputChange("txtValue", e.target.value)}
									style={{ width: "100%" }}>
									Value
								</VSCodeTextField>
							</div>
						</div>
					)}

					{!isInternalProperties && (
						<div>
							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Encoding
								</label>
								<VSCodeDropdown
									value={formData.cboEncoding}
									onInput={(e: any) => handleInputChange("cboEncoding", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="UTF-8">UTF-8</VSCodeOption>
									<VSCodeOption value="ISO-8859-1">ISO-8859-1</VSCodeOption>
									<VSCodeOption value="Windows-1252">Windows-1252</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtPropertyFile}
									placeholder="Enter property file name"
									onInput={(e: any) => handleInputChange("txtPropertyFile", e.target.value)}
									style={{ width: "100%" }}>
									Property File Name
								</VSCodeTextField>
							</div>
						</div>
					)}
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

export default PropertyForm
