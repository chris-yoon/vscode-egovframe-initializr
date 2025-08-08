import React, { useState, useEffect } from "react"
import {
	VSCodeButton,
	VSCodeTextField,
	VSCodeRadioGroup,
	VSCodeRadio,
	VSCodeDropdown,
	VSCodeOption,
	VSCodeCheckbox,
} from "@vscode/webview-ui-toolkit/react"
import { ConfigFormData, ConfigGenerationType, FormComponentProps } from "../types/templates"
import { vscode } from "../../../utils/vscode"

const CacheForm: React.FC<FormComponentProps> = ({ onSubmit, onCancel, template, initialData }) => {
	const [currentPage, setCurrentPage] = useState(1)
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "ehcache-default",
		txtDiskStore: "user.dir/second",
		txtDftMaxElements: "10000",
		txtDftEternal: "false",
		txtDftIdelTime: "120",
		txtDftLiveTime: "120",
		txtDftOverfow: "true",
		txtDftDiskPersistence: "true",
		txtDftDiskExpiry: "120",
		txtCacheName: "",
		txtMaxElements: "100",
		txtEternal: "false",
		txtIdleTime: "360",
		txtLiveTime: "1000",
		txtOverflowToDisk: "false",
		txtDiskPersistent: "false",
		cboMemoryPolicy: "LRU",
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
				// If we have pending form data, submit it now
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
				return "context-ehcache"
			case ConfigGenerationType.JAVA_CONFIG:
				return "EgovEhcacheConfig"
			default:
				return "ehcache-default"
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
			{ field: "txtDiskStore" as keyof typeof formData, label: "Disk Store Path" },
			{ field: "txtDftMaxElements" as keyof typeof formData, label: "Default Cache Max Elements" },
			{ field: "txtDftIdelTime" as keyof typeof formData, label: "Default Cache Idle Time" },
			{ field: "txtDftLiveTime" as keyof typeof formData, label: "Default Cache Live Time" },
			{ field: "txtDftDiskExpiry" as keyof typeof formData, label: "Default Cache Disk Expiry" },
		]

		if (currentPage === 2) {
			requiredFields.push(
				{ field: "txtCacheName" as keyof typeof formData, label: "Cache Name" },
				{ field: "txtMaxElements" as keyof typeof formData, label: "Max Elements" },
				{ field: "txtIdleTime" as keyof typeof formData, label: "Idle Time" },
				{ field: "txtLiveTime" as keyof typeof formData, label: "Live Time" },
			)
		}

		const missingFields = requiredFields.filter(({ field }) => !formData[field]?.toString().trim())

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

	return (
		<div style={{ padding: "20px", maxWidth: "600px" }}>
			<h2 style={{ color: "var(--vscode-foreground)", marginBottom: "20px" }}>Set Default Cache</h2>

			<form onSubmit={handleSubmit}>
				{currentPage === 1 && (
					<div>
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
									value={formData.txtDiskStore}
									placeholder="Enter disk store path"
									onInput={(e: any) => handleInputChange("txtDiskStore", e.target.value)}
									style={{ width: "100%" }}
									required>
									Disk Store Path <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtDftMaxElements}
									placeholder="Enter default cache max elements"
									onInput={(e: any) => handleInputChange("txtDftMaxElements", e.target.value)}
									style={{ width: "100%" }}
									required>
									Default Cache Max Elements <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Default Cache Eternal <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.txtDftEternal}
									onInput={(e: any) => handleInputChange("txtDftEternal", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="true">True</VSCodeOption>
									<VSCodeOption value="false">False</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtDftIdelTime}
									placeholder="Enter default cache idle time"
									onInput={(e: any) => handleInputChange("txtDftIdelTime", e.target.value)}
									style={{ width: "100%" }}
									required>
									Default Cache Idle Time (sec){" "}
									<span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtDftLiveTime}
									placeholder="Enter default cache live time"
									onInput={(e: any) => handleInputChange("txtDftLiveTime", e.target.value)}
									style={{ width: "100%" }}
									required>
									Default Cache Live Time (sec){" "}
									<span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Default Cache Overflow to Disk{" "}
									<span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.txtDftOverfow}
									onInput={(e: any) => handleInputChange("txtDftOverfow", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="true">True</VSCodeOption>
									<VSCodeOption value="false">False</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Default Cache Disk Persistent{" "}
									<span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.txtDftDiskPersistence}
									onInput={(e: any) => handleInputChange("txtDftDiskPersistence", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="true">True</VSCodeOption>
									<VSCodeOption value="false">False</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "20px" }}>
								<VSCodeTextField
									value={formData.txtDftDiskExpiry}
									placeholder="Enter default cache disk expiry"
									onInput={(e: any) => handleInputChange("txtDftDiskExpiry", e.target.value)}
									style={{ width: "100%" }}
									required>
									Default Cache Disk Expiry (sec){" "}
									<span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>
						</div>

						<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
							<VSCodeButton appearance="secondary" onClick={onCancel}>
								Cancel
							</VSCodeButton>
							<VSCodeButton onClick={() => setCurrentPage(2)}>Next</VSCodeButton>
						</div>
					</div>
				)}

				{currentPage === 2 && (
					<div>
						<div style={{ marginBottom: "20px" }}>
							<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Set Custom Cache</h3>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtCacheName}
									placeholder="Enter cache name"
									onInput={(e: any) => handleInputChange("txtCacheName", e.target.value)}
									style={{ width: "100%" }}
									required>
									Cache Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtMaxElements}
									placeholder="Enter max elements"
									onInput={(e: any) => handleInputChange("txtMaxElements", e.target.value)}
									style={{ width: "100%" }}
									required>
									Max Elements <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Eternal <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.txtEternal}
									onInput={(e: any) => handleInputChange("txtEternal", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="true">True</VSCodeOption>
									<VSCodeOption value="false">False</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtIdleTime}
									placeholder="Enter idle time"
									onInput={(e: any) => handleInputChange("txtIdleTime", e.target.value)}
									style={{ width: "100%" }}
									required>
									Idle Time (sec) <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtLiveTime}
									placeholder="Enter live time"
									onInput={(e: any) => handleInputChange("txtLiveTime", e.target.value)}
									style={{ width: "100%" }}
									required>
									Live Time (sec) <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Overflow to Disk <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.txtOverflowToDisk}
									onInput={(e: any) => handleInputChange("txtOverflowToDisk", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="true">True</VSCodeOption>
									<VSCodeOption value="false">False</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Disk Persistent <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.txtDiskPersistent}
									onInput={(e: any) => handleInputChange("txtDiskPersistent", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="true">True</VSCodeOption>
									<VSCodeOption value="false">False</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "20px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Memory Store Eviction Policy <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.cboMemoryPolicy}
									onInput={(e: any) => handleInputChange("cboMemoryPolicy", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="LRU">LRU</VSCodeOption>
									<VSCodeOption value="FIFO">FIFO</VSCodeOption>
									<VSCodeOption value="LFU">LFU</VSCodeOption>
								</VSCodeDropdown>
							</div>
						</div>

						<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
							<VSCodeButton appearance="secondary" onClick={() => setCurrentPage(1)}>
								Previous
							</VSCodeButton>
							<VSCodeButton appearance="secondary" onClick={onCancel}>
								Cancel
							</VSCodeButton>
							<VSCodeButton type="submit" appearance="primary">
								Generate
							</VSCodeButton>
						</div>
					</div>
				)}
			</form>
		</div>
	)
}

export default CacheForm
