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

const TransactionForm: React.FC<FormComponentProps> = ({ onSubmit, onCancel, template, initialData }) => {
	const [formData, setFormData] = useState<ConfigFormData>({
		generationType: ConfigGenerationType.XML,
		txtFileName: "context-transaction",
		txtTransactionName: "transactionManager",
		txtDataSourceName: "dataSource",
		txtEttMgrFactory: "entityManagerFactory",
		txtEntityPackages: "",
		cmbDialect: "org.hibernate.dialect.H2Dialect",
		txtRepositoryPackage: "",
		txtPointCutName: "requiredTx",
		txtPointCutExpression: "execution(* egovframework.sample..*Impl.*(..))",
		txtAdviceName: "txAdvice",
		txtMethodName: "*",
		chkReadOnly: false,
		chkRollbackFor: true,
		txtRollbackFor: "Exception",
		chkNoRollbackFor: false,
		txtNoRollbackFor: "RuntimeException",
		chkTimeout: false,
		txtTimeout: "20",
		cmbPropagation: "REQUIRED",
		cmbIsolation: "DEFAULT",
		...initialData,
	})
	const [selectedOutputFolder, setSelectedOutputFolder] = useState<string | null>(null)
	const [pendingFormData, setPendingFormData] = useState<ConfigFormData | null>(null)

	// Determine form type based on template webView
	const getFormType = () => {
		if (template.webView.includes("jpa")) return "jpa"
		if (template.webView.includes("jta")) return "jta"
		return "datasource"
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
		const baseNames = {
			datasource: { xml: "context-transaction-datasource", java: "EgovTransactionDatasourceConfig" },
			jpa: { xml: "context-transaction-jpa", java: "EgovTransactionJpaConfig" },
			jta: { xml: "context-transaction-jta", java: "EgovTransactionJtaConfig" },
		}

		const names = baseNames[formType as keyof typeof baseNames]
		switch (type) {
			case ConfigGenerationType.XML:
				return names.xml
			case ConfigGenerationType.JAVA_CONFIG:
				return names.java
			default:
				return names.xml
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
			{ field: "txtTransactionName" as keyof typeof formData, label: "Transaction Manager Name" },
			{ field: "txtDataSourceName" as keyof typeof formData, label: "Data Source Name" },
		]

		if (formType === "jpa") {
			requiredFields.push(
				{ field: "txtEttMgrFactory" as keyof typeof formData, label: "Entity Manager Factory Name" },
				{ field: "txtEntityPackages" as keyof typeof formData, label: "Entity Packages to Scan" },
				{ field: "txtRepositoryPackage" as keyof typeof formData, label: "Repository Package" },
			)
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
			case "jpa":
				return "Create JPA Transaction"
			case "jta":
				return "Create JTA Transaction"
			default:
				return "Create Datasource Transaction"
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

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtTransactionName}
							placeholder="Enter transaction manager name"
							onInput={(e: any) => handleInputChange("txtTransactionName", e.target.value)}
							style={{ width: "100%" }}
							required>
							Transaction Manager Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtDataSourceName}
							placeholder="Enter data source name"
							onInput={(e: any) => handleInputChange("txtDataSourceName", e.target.value)}
							style={{ width: "100%" }}
							required>
							Data Source Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
						</VSCodeTextField>
					</div>

					{formType === "jpa" && (
						<>
							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtEttMgrFactory}
									placeholder="Enter entity manager factory name"
									onInput={(e: any) => handleInputChange("txtEttMgrFactory", e.target.value)}
									style={{ width: "100%" }}
									required>
									Entity Manager Factory Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtEntityPackages}
									placeholder="com.example.domain"
									onInput={(e: any) => handleInputChange("txtEntityPackages", e.target.value)}
									style={{ width: "100%" }}
									required>
									Entity Packages to Scan <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
									Dialect Name <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</label>
								<VSCodeDropdown
									value={formData.cmbDialect}
									onInput={(e: any) => handleInputChange("cmbDialect", e.target.value)}
									style={{ width: "100%" }}>
									<VSCodeOption value="org.hibernate.dialect.H2Dialect">H2 Dialect</VSCodeOption>
									<VSCodeOption value="org.hibernate.dialect.MySQL5Dialect">MySQL 5 Dialect</VSCodeOption>
									<VSCodeOption value="org.hibernate.dialect.MySQL8Dialect">MySQL 8 Dialect</VSCodeOption>
									<VSCodeOption value="org.hibernate.dialect.PostgreSQL12Dialect">
										PostgreSQL 12 Dialect
									</VSCodeOption>
									<VSCodeOption value="org.hibernate.dialect.Oracle12cDialect">Oracle 12c Dialect</VSCodeOption>
									<VSCodeOption value="org.hibernate.dialect.SQLServer2016Dialect">
										SQL Server 2016 Dialect
									</VSCodeOption>
								</VSCodeDropdown>
							</div>

							<div style={{ marginBottom: "15px" }}>
								<VSCodeTextField
									value={formData.txtRepositoryPackage}
									placeholder="com.example.repository"
									onInput={(e: any) => handleInputChange("txtRepositoryPackage", e.target.value)}
									style={{ width: "100%" }}
									required>
									Repository Package <span style={{ color: "var(--vscode-errorForeground)" }}>*</span>
								</VSCodeTextField>
							</div>
						</>
					)}
				</div>

				<div style={{ marginBottom: "20px" }}>
					<h3 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Transaction Attributes</h3>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtPointCutName}
							placeholder="Enter pointcut name"
							onInput={(e: any) => handleInputChange("txtPointCutName", e.target.value)}
							style={{ width: "100%" }}>
							Pointcut Name
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtPointCutExpression}
							placeholder="Enter pointcut expression"
							onInput={(e: any) => handleInputChange("txtPointCutExpression", e.target.value)}
							style={{ width: "100%" }}>
							Pointcut Expression
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtAdviceName}
							placeholder="Enter advice name"
							onInput={(e: any) => handleInputChange("txtAdviceName", e.target.value)}
							style={{ width: "100%" }}>
							Advice Name
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeTextField
							value={formData.txtMethodName}
							placeholder="Enter method name"
							onInput={(e: any) => handleInputChange("txtMethodName", e.target.value)}
							style={{ width: "100%" }}>
							Method Name
						</VSCodeTextField>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeCheckbox
							checked={formData.chkReadOnly}
							onChange={(e: any) => handleInputChange("chkReadOnly", e.target.checked)}>
							Read-Only
						</VSCodeCheckbox>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<VSCodeCheckbox
							checked={formData.chkRollbackFor}
							onChange={(e: any) => handleInputChange("chkRollbackFor", e.target.checked)}>
							Rollback For Exception
						</VSCodeCheckbox>
					</div>

					{formData.chkRollbackFor && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtRollbackFor}
								placeholder="Enter rollback-for exception"
								onInput={(e: any) => handleInputChange("txtRollbackFor", e.target.value)}
								style={{ width: "100%" }}>
								Rollback For
							</VSCodeTextField>
						</div>
					)}

					<div style={{ marginBottom: "15px" }}>
						<VSCodeCheckbox
							checked={formData.chkNoRollbackFor}
							onChange={(e: any) => handleInputChange("chkNoRollbackFor", e.target.checked)}>
							No Rollback For Exception
						</VSCodeCheckbox>
					</div>

					{formData.chkNoRollbackFor && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtNoRollbackFor}
								placeholder="Enter no-rollback-for exception"
								onInput={(e: any) => handleInputChange("txtNoRollbackFor", e.target.value)}
								style={{ width: "100%" }}>
								No Rollback For
							</VSCodeTextField>
						</div>
					)}

					<div style={{ marginBottom: "15px" }}>
						<VSCodeCheckbox
							checked={formData.chkTimeout}
							onChange={(e: any) => handleInputChange("chkTimeout", e.target.checked)}>
							Set Timeout
						</VSCodeCheckbox>
					</div>

					{formData.chkTimeout && (
						<div style={{ marginBottom: "15px" }}>
							<VSCodeTextField
								value={formData.txtTimeout}
								placeholder="Enter timeout in seconds"
								onInput={(e: any) => handleInputChange("txtTimeout", e.target.value)}
								style={{ width: "100%" }}>
								Timeout (seconds)
							</VSCodeTextField>
						</div>
					)}

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Propagation
						</label>
						<VSCodeDropdown
							value={formData.cmbPropagation}
							onInput={(e: any) => handleInputChange("cmbPropagation", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="REQUIRED">REQUIRED</VSCodeOption>
							<VSCodeOption value="SUPPORTS">SUPPORTS</VSCodeOption>
							<VSCodeOption value="MANDATORY">MANDATORY</VSCodeOption>
							<VSCodeOption value="REQUIRES_NEW">REQUIRES_NEW</VSCodeOption>
							<VSCodeOption value="NOT_SUPPORTED">NOT_SUPPORTED</VSCodeOption>
							<VSCodeOption value="NEVER">NEVER</VSCodeOption>
							<VSCodeOption value="NESTED">NESTED</VSCodeOption>
						</VSCodeDropdown>
					</div>

					<div style={{ marginBottom: "15px" }}>
						<label style={{ display: "block", marginBottom: "5px", color: "var(--vscode-foreground)" }}>
							Isolation
						</label>
						<VSCodeDropdown
							value={formData.cmbIsolation}
							onInput={(e: any) => handleInputChange("cmbIsolation", e.target.value)}
							style={{ width: "100%" }}>
							<VSCodeOption value="DEFAULT">DEFAULT</VSCodeOption>
							<VSCodeOption value="READ_UNCOMMITTED">READ_UNCOMMITTED</VSCodeOption>
							<VSCodeOption value="READ_COMMITTED">READ_COMMITTED</VSCodeOption>
							<VSCodeOption value="REPEATABLE_READ">REPEATABLE_READ</VSCodeOption>
							<VSCodeOption value="SERIALIZABLE">SERIALIZABLE</VSCodeOption>
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

export default TransactionForm
