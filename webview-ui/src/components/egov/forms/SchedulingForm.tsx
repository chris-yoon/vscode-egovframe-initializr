import React, { useState, useEffect } from "react"
import {
	VSCodeButton,
	VSCodeTextField,
	VSCodeRadioGroup,
	VSCodeRadio,
	VSCodeCheckbox,
	VSCodeDropdown,
	VSCodeOption,
} from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType, FormComponentProps } from "../types/templates"
import { vscode } from "../../../utils/vscode"

const SchedulingForm: React.FC<FormComponentProps> = ({ onSubmit, onCancel, template, initialData }) => {
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-scheduling",
		txtJobName: "jobDetail",
		txtServiceClass: "",
		chkProperty: true,
		txtPropertyName: "paramSampleJob",
		txtPropertyValue: "SampleJobValue",
		txtTriggerName: "trigger",
		txtGroup: "group1",
		txtJobGroup: "group1",
		txtCronExpression: "0 0 6 * * ?",
		txtRepeatInterval: "10000",
		txtRepeatCount: "10",
		txtTargetObject: "",
		txtTargetMethod: "",
		txtSchedulerName: "scheduler",
		...initialData,
	})
	const [selectedOutputFolder, setSelectedOutputFolder] = useState<string | null>(null)
	const [pendingFormData, setPendingFormData] = useState<ConfigFormData | null>(null)

	// Determine form type based on template webView
	const getFormType = () => {
		if (template.webView.includes("beanJob")) return "beanJob"
		if (template.webView.includes("methodJob")) return "methodJob"
		if (template.webView.includes("cronTrigger")) return "cronTrigger"
		if (template.webView.includes("simpleTrigger")) return "simpleTrigger"
		if (template.webView.includes("scheduler")) return "scheduler"
		return "beanJob"
	}

	const formType = getFormType()

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
				return "context-scheduling"
			case ConfigGenerationType.JAVA_CONFIG:
				return "EgovSchedulingConfig"
			default:
				return "context-scheduling"
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

		// Validate required fields based on form type
		const requiredFields = [{ field: "txtFileName" as keyof typeof formData, label: "File Name" }]

		if (formType === "beanJob" || formType === "methodJob") {
			requiredFields.push({ field: "txtJobName" as keyof typeof formData, label: "Job Name" })
		}

		if (formType === "beanJob") {
			requiredFields.push({ field: "txtServiceClass" as keyof typeof formData, label: "Job Class" })
		}

		if (formType === "methodJob") {
			requiredFields.push(
				{ field: "txtTargetObject" as keyof typeof formData, label: "Target Object" },
				{ field: "txtTargetMethod" as keyof typeof formData, label: "Target Method" },
			)
		}

		if (formType === "cronTrigger" || formType === "simpleTrigger") {
			requiredFields.push({ field: "txtTriggerName" as keyof typeof formData, label: "Trigger Name" })
		}

		if (formType === "cronTrigger") {
			requiredFields.push({ field: "txtCronExpression" as keyof typeof formData, label: "Cron Expression" })
		}

		if (formType === "simpleTrigger") {
			requiredFields.push({ field: "txtRepeatInterval" as keyof typeof formData, label: "Repeat Interval" })
		}

		if (formType === "scheduler") {
			requiredFields.push({ field: "txtSchedulerName" as keyof typeof formData, label: "Scheduler Name" })
		}

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

	const getFormTitle = () => {
		switch (formType) {
			case "beanJob":
				return "Create Detail Bean Job"
			case "methodJob":
				return "Create Method Invoking Job"
			case "cronTrigger":
				return "Create Cron Trigger"
			case "simpleTrigger":
				return "Create Simple Trigger"
			case "scheduler":
				return "Create Scheduler"
			default:
				return "Create Scheduling Configuration"
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

					{(formType === "beanJob" || formType === "methodJob") && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtJobName}
								placeholder="Enter job name"
								onInput={(e: any) => handleInputChange("txtJobName", e.target.value)}
								style={{ width: "100%" }}
								required>
								Job Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
							</VSCodeTextField>
						</div>
					)}

					{formType === "beanJob" && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtServiceClass}
								placeholder="Enter service class name"
								onInput={(e: any) => handleInputChange("txtServiceClass", e.target.value)}
								style={{ width: "100%" }}
								required>
								Job Class <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
							</VSCodeTextField>
						</div>
					)}

					{formType === "methodJob" && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtTargetObject}
									placeholder="Enter target object"
									onInput={(e: any) => handleInputChange("txtTargetObject", e.target.value)}
									style={{ width: "100%" }}
									required>
									Target Object <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtTargetMethod}
									placeholder="Enter target method"
									onInput={(e: any) => handleInputChange("txtTargetMethod", e.target.value)}
									style={{ width: "100%" }}
									required>
									Target Method <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>
						</>
					)}

					{(formType === "beanJob" || formType === "methodJob") && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<VSCodeCheckbox
									checked={formData.chkProperty}
									onChange={(e: any) => handleInputChange("chkProperty", e.target.checked)}>
									Add Property
								</VSCodeCheckbox>
							</div>

							{formData.chkProperty && (
								<>
									<div style={{ marginBottom: "15px" }}>
										<VSCodeTextField
											value={formData.txtPropertyName}
											placeholder="Enter property name"
											onInput={(e: any) => handleInputChange("txtPropertyName", e.target.value)}
											style={{ width: "100%" }}>
											Property Name
										</VSCodeTextField>
									</div>

									<div style={{ marginBottom: "15px" }}>
										<VSCodeTextField
											value={formData.txtPropertyValue}
											placeholder="Enter property value"
											onInput={(e: any) => handleInputChange("txtPropertyValue", e.target.value)}
											style={{ width: "100%" }}>
											Property Value
										</VSCodeTextField>
									</div>
								</>
							)}
						</>
					)}

					{(formType === "cronTrigger" || formType === "simpleTrigger") && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtTriggerName}
									placeholder="Enter trigger name"
									onInput={(e: any) => handleInputChange("txtTriggerName", e.target.value)}
									style={{ width: "100%" }}
									required>
									Trigger Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtGroup}
									placeholder="Enter trigger group"
									onInput={(e: any) => handleInputChange("txtGroup", e.target.value)}
									style={{ width: "100%" }}>
									Trigger Group
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtJobGroup}
									placeholder="Enter job group"
									onInput={(e: any) => handleInputChange("txtJobGroup", e.target.value)}
									style={{ width: "100%" }}>
									Job Group
								</VSCodeTextField>
							</div>
						</>
					)}

					{formType === "cronTrigger" && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtCronExpression}
								placeholder="Enter cron expression"
								onInput={(e: any) => handleInputChange("txtCronExpression", e.target.value)}
								style={{ width: "100%" }}
								required>
								Cron Expression <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
							</VSCodeTextField>
						</div>
					)}

					{formType === "simpleTrigger" && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtRepeatInterval}
									placeholder="Enter repeat interval"
									onInput={(e: any) => handleInputChange("txtRepeatInterval", e.target.value)}
									style={{ width: "100%" }}
									required>
									Repeat Interval <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtRepeatCount}
									placeholder="Enter repeat count"
									onInput={(e: any) => handleInputChange("txtRepeatCount", e.target.value)}
									style={{ width: "100%" }}>
									Repeat Count
								</VSCodeTextField>
							</div>
						</>
					)}

					{formType === "scheduler" && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtSchedulerName}
								placeholder="Enter scheduler name"
								onInput={(e: any) => handleInputChange("txtSchedulerName", e.target.value)}
								style={{ width: "100%" }}
								required>
								Scheduler Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
							</VSCodeTextField>
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

export default SchedulingForm
