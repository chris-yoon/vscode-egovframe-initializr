import { Button, TextArea, Link, ProgressRing, TextField } from "../../ui"
import { useState, useEffect } from "react"
import { parseDDL, validateDDL, generateSampleDDL, ParsedDDL } from "../../../utils/ddlParser"
import { getTemplateContext } from "../../../utils/templateContext"
import { WebviewMessage, ExtensionResponse } from "../../../utils/messageTypes"
import { createSelectOutputPathMessage } from "../../../utils/egovUtils"
import { vscode } from "../../../utils/vscode"
import { useCodeViewState } from "../../../context/EgovTabsStateContext"
import CodePreview from "../CodePreview"

const CodeView = () => {
	console.log("CodeView component rendering...")

	const { state, updateState } = useCodeViewState()
	const {
		ddlContent,
		parsedDDL,
		isValid,
		isLoading,
		error,
		outputPath,
		packageName,
		// 미리보기 관련 상태
		previews,
		selectedPreviewTemplate,
		isPreviewLoading,
		previewError,
		autoUpdatePreview
	} = state

	// Helper functions to update state
	const setDdlContent = (value: string) => updateState({ ddlContent: value })
	const setParsedDDL = (value: ParsedDDL | null) => updateState({ parsedDDL: value })
	const setIsValid = (value: boolean) => updateState({ isValid: value })
	const setIsLoading = (value: boolean) => updateState({ isLoading: value })
	const setError = (value: string) => updateState({ error: value })
	const setOutputPath = (value: string) => updateState({ outputPath: value })
	const setPackageName = (value: string) => updateState({ packageName: value })
	
	// 미리보기 관련 Helper functions
	const setPreviews = (value: { [key: string]: string } | null) => updateState({ previews: value })
	const setSelectedPreviewTemplate = (value: string) => updateState({ selectedPreviewTemplate: value })
	const setIsPreviewLoading = (value: boolean) => updateState({ isPreviewLoading: value })
	const setPreviewError = (value: string) => updateState({ previewError: value })
	const setAutoUpdatePreview = (value: boolean) => updateState({ autoUpdatePreview: value })

	// DDL 유효성 검사 및 파싱 (빠른 검증만 수행)
	useEffect(() => {
		console.log("DDL validation effect running...", ddlContent.length)

		if (!ddlContent.trim()) {
			setIsValid(false)
			setParsedDDL(null)
			setError("")
			setPreviews(null)
			setPreviewError("")
			return
		}

		// DDL이 변경되면 기존 미리보기 무효화
		setPreviews(null)
		setPreviewError("")

		// 디바운스 적용 (300ms로 단축)
		const debounceTimer = setTimeout(() => {
			try {
				const isValidDDL = validateDDL(ddlContent)
				setIsValid(isValidDDL)

				if (isValidDDL) {
					const parsed = parseDDL(ddlContent)
					setParsedDDL(parsed)
					setError("")
					
					// 빠른 검증만 요청 (미리보기는 나중에)
					vscode.postMessage({
						type: "validateDDLOnly",
						ddl: ddlContent,
						packageName: packageName
					})
				} else {
					setParsedDDL(null)
					setError("Invalid DDL format")
					setPreviews(null)
					setPreviewError("")
				}
			} catch (err) {
				console.error("DDL parsing error:", err)
				setIsValid(false)
				setParsedDDL(null)
				setError(err instanceof Error ? err.message : "Parsing error")
				setPreviews(null)
				setPreviewError("")
			}
		}, 300) // 500ms에서 300ms로 단축

		return () => clearTimeout(debounceTimer)
	}, [ddlContent, packageName])

	// 자동 미리보기 업데이트 (DDL이 유효하고 자동 업데이트가 활성화된 경우)
	useEffect(() => {
		if (isValid && ddlContent.trim() && autoUpdatePreview && !previews) {
			console.log("Auto-updating preview due to DDL change...")
			handleRequestPreview()
		}
	}, [isValid, ddlContent, autoUpdatePreview, previews])

	// VSCode 익스텐션으로부터 메시지 수신
	useEffect(() => {
		console.log("Setting up message listener...")

		// Request current workspace path when component mounts
		try {
			vscode.postMessage({ type: "getWorkspacePath" })
		} catch (err) {
			console.error("Error sending getWorkspacePath message:", err)
		}

		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			console.log("Received message from extension:", message)
			setIsLoading(false)

			if (message && typeof message === "object" && "type" in message) {
				switch (message.type) {
					case "error":
						console.error("Extension error:", message.message)
						setError(message.message || "Unknown error occurred")
						break
					case "success":
						console.log("Extension success:", message.message)
						setError("")
						break
					case "sampleDDL":
						setDdlContent(message.ddl || "")
						break
					case "selectedOutputPath":
						if (message.text) {
							setOutputPath(message.text)
						}
						break
					case "currentWorkspacePath":
						if (message.text) {
							setOutputPath(message.text)
						}
						break
					case "transferDDLToCodeView":
						console.log("[CodeView] Received transferDDLToCodeView message:", message)
						if (message.ddl) {
							console.log("[CodeView] Setting DDL content:", message.ddl)
							setDdlContent(message.ddl)
							setError("")
							// Show a temporary success message
							setTimeout(() => {
								console.log("[CodeView] Showing success message")
								setError("✅ DDL successfully imported from chat!")
								setTimeout(() => {
									console.log("[CodeView] Clearing success message")
									setError("")
								}, 3000)
							}, 100)
						} else {
							console.warn("[CodeView] transferDDLToCodeView message has no DDL")
						}
						break
					case "validationResult":
						console.log("[CodeView] Received validationResult message:", message)
						setIsPreviewLoading(false)
						if (message.isValid) {
							setIsValid(true)
							if (message.previews) {
								setPreviews(message.previews)
								setPreviewError("")
							}
							if (message.error && message.error.includes('⚠️ 경고:')) {
								setError(message.error)
							} else {
								setError("")
							}
						} else {
							setIsValid(false)
							setPreviews(null)
							if (message.error) {
								setPreviewError(message.error)
							}
						}
						break
					default:
						console.log("Unhandled message type:", message.type)
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			console.log("Cleaning up message listener...")
			window.removeEventListener("message", handleMessage)
		}
	}, [])

	const handleGenerateCode = () => {
		console.log("Generate code clicked")
		if (!isValid || !ddlContent.trim()) return

		// Validate required fields
		if (!packageName.trim()) {
			setError("Package name is required")
			return
		}
		if (!outputPath.trim()) {
			setError("Output path is required")
			return
		}

		setIsLoading(true)
		setError("")
		try {
			vscode.postMessage({
				type: "generateCode",
				ddl: ddlContent,
				packageName: packageName.trim(),
				outputPath: outputPath.trim(),
			})
		} catch (err) {
			console.error("Error sending generateCode message:", err)
			setError("Failed to send message to extension")
			setIsLoading(false)
		}
	}

	const handleUploadTemplates = () => {
		console.log("Upload templates clicked")
		if (!isValid || !ddlContent.trim()) return

		setIsLoading(true)
		setError("")
		try {
			vscode.postMessage({
				type: "uploadTemplates",
				ddl: ddlContent,
			})
		} catch (err) {
			console.error("Error sending uploadTemplates message:", err)
			setError("Failed to send message to extension")
			setIsLoading(false)
		}
	}

	const handleDownloadTemplateContext = () => {
		console.log("Download template context clicked")
		if (!isValid || !parsedDDL) return

		try {
			const context = getTemplateContext(parsedDDL.tableName, parsedDDL.attributes, parsedDDL.pkAttributes)

			setIsLoading(true)
			setError("")
			vscode.postMessage({
				type: "downloadTemplateContext",
				ddl: ddlContent,
				context,
			})
		} catch (err) {
			console.error("Error in downloadTemplateContext:", err)
			setError(err instanceof Error ? err.message : "Context generation error")
		}
	}

	const handleInsertSampleDDL = () => {
		console.log("Insert sample DDL clicked")
		try {
			const sampleDDL = generateSampleDDL()
			setDdlContent(sampleDDL)
		} catch (err) {
			console.error("Error generating sample DDL:", err)
			setError("Failed to generate sample DDL")
		}
	}

	const handleSelectOutputPath = () => {
		console.log("Select output path clicked")
		console.log("vscode object:", typeof vscode, vscode)

		try {
			if (typeof vscode === "undefined") {
				console.error("vscode object is undefined")
				setError("VSCode API not available")
				return
			}

			if (typeof vscode.postMessage !== "function") {
				console.error("vscode.postMessage is not a function")
				setError("VSCode postMessage not available")
				return
			}

			const message = createSelectOutputPathMessage()
			console.log("Sending message:", message)
			vscode.postMessage(message)
		} catch (err) {
			console.error("Error sending selectOutputPath message:", err)
			setError(`Failed to send message to extension: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	// 미리보기 요청 함수
	const handleRequestPreview = () => {
		if (!isValid || !ddlContent.trim()) return

		setIsPreviewLoading(true)
		setPreviewError("")
		vscode.postMessage({
			type: "validateAndPreview",
			ddl: ddlContent,
			packageName: packageName
		})
	}

	console.log("CodeView rendering with state:", {
		ddlContentLength: ddlContent.length,
		isValid,
		parsedDDL: !!parsedDDL,
		error,
		outputPath,
		packageName,
	})

	try {
		return (
			<div style={{ padding: "16px 20px" }}>
				<div
					style={{
						color: "var(--vscode-foreground)",
						fontSize: "13px",
						marginBottom: "16px",
						marginTop: "5px",
					}}>
					<h3 style={{ color: "var(--vscode-foreground)", marginTop: 0, marginBottom: "8px" }}>
						Generate eGovFrame Code from DDL
					</h3>
					<p
						style={{
							fontSize: "12px",
							color: "var(--vscode-descriptionForeground)",
							margin: 0,
							marginTop: "5px",
						}}>
						Generate CRUD operations and database-related code from DDL (Data Definition Language) statements.
						Supports Oracle, MySQL, PostgreSQL and more. Uses Handlebars template engine. Learn more at{" "}
						<Link href="https://github.com/chris-yoon/egovframe-pack" style={{ display: "inline" }}>
							GitHub
						</Link>
					</p>
				</div>

				{/* Toolbar */}
				<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
					<button
						style={{
							backgroundColor: "var(--vscode-button-secondaryBackground)",
							color: "var(--vscode-button-secondaryForeground)",
							border: "1px solid var(--vscode-button-border)",
							borderRadius: "4px",
							padding: "8px 12px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							fontSize: "13px",
							fontFamily: "inherit",
							outline: "none",
						}}
						onMouseOver={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryHoverBackground)"
						}}
						onMouseOut={(e) => {
							(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryBackground)"
						}}
						onFocus={(e) => {
							(e.target as HTMLButtonElement).style.outline = "1px solid var(--vscode-focusBorder)"
						}}
						onBlur={(e) => {
							(e.target as HTMLButtonElement).style.outline = "none"
						}}
						onClick={handleInsertSampleDDL}
					>
						<span className="codicon codicon-code" style={{ marginRight: "6px" }}></span>
						Insert Sample DDL
					</button>
				</div>

				{/* DDL Input Section */}
				<div style={{ marginBottom: "20px" }}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px", marginTop: 0 }}>
						DDL Input
						{ddlContent.trim() && (
							<span
								style={{
									marginLeft: "10px",
									fontSize: "12px",
									color: isValid ? "var(--vscode-terminal-ansiGreen)" : "var(--vscode-errorForeground)",
								}}>
								{isValid ? "✓ Valid" : "✗ Invalid"}
							</span>
						)}
					</h4>
					<textarea
						rows={15}
						style={{
							width: "calc(100% - 24px)",
							padding: "12px",
							fontFamily: "monospace",
							backgroundColor: "var(--vscode-input-background)",
							color: "var(--vscode-input-foreground)",
							border: `1px solid ${error ? "var(--vscode-errorBorder)" : "var(--vscode-input-border)"}`,
							borderRadius: "4px",
							fontSize: "13px",
							resize: "vertical",
							outline: "none",
							minHeight: "200px",
						}}
						onFocus={(e) => {
							e.target.style.borderColor = "var(--vscode-focusBorder)"
						}}
						onBlur={(e) => {
							e.target.style.borderColor = error ? "var(--vscode-errorBorder)" : "var(--vscode-input-border)"
						}}
						placeholder="Enter your DDL statements here..."
						value={ddlContent}
						onChange={(e: any) => setDdlContent(e.target.value)}
					/>
					{error && (
						<div
							style={{
								color: "var(--vscode-errorForeground)",
								fontSize: "12px",
								marginTop: "5px",
							}}>
							{error}
						</div>
					)}
				</div>

				{/* Parsed DDL Preview */}
				{parsedDDL && (
					<div style={{ marginBottom: "20px" }}>
						<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>
							Parsed Table: {parsedDDL.tableName}
						</h4>
						<div
							style={{
								backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
								padding: "10px",
								borderRadius: "4px",
								fontSize: "12px",
							}}>
							<div style={{ marginBottom: "8px" }}>
								<strong>Columns ({parsedDDL.attributes.length}):</strong>
							</div>
							{parsedDDL.attributes.map((col, index) => (
								<div key={index} style={{ marginLeft: "10px", marginBottom: "2px" }}>
									{col.columnName} ({col.dataType}) → {col.ccName} ({col.javaType})
									{col.isPrimaryKey && (
										<span style={{ color: "var(--vscode-terminal-ansiYellow)" }}> [PK]</span>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Code Preview */}
				<CodePreview
					previews={previews}
					selectedTemplate={selectedPreviewTemplate}
					onTemplateChange={setSelectedPreviewTemplate}
					isLoading={isPreviewLoading}
					error={previewError}
					packageName={packageName}
					onRequestPreview={handleRequestPreview}
					isValid={isValid}
					autoUpdatePreview={autoUpdatePreview}
					onAutoUpdateChange={setAutoUpdatePreview}
				/>

				{/* Configuration Section */}
				{isValid && parsedDDL && (
					<div style={{ marginBottom: "20px" }}>
						<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Configuration</h4>

						{/* Package Name */}
						<div style={{ width: "calc(100% - 24px)", marginBottom: "15px" }}>
							<TextField
								label="Package Name"
								value={packageName}
								onChange={(e: any) => setPackageName(e.target.value)}
								placeholder="e.g., com.example.project"
								isRequired
							/>
							<div style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground)", marginTop: "2px" }}>
								Java package naming convention (e.g., com.company.project)
							</div>
						</div>

						{/* Output Path */}
						<div style={{ marginBottom: "15px" }}>
							<label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Output Path *</label>
							<div style={{ display: "flex", gap: "10px", maxWidth: "100%" }}>
								<div style={{ flex: 1 }}>
									<TextField
										label=""
										value={outputPath}
										onChange={(e: any) => setOutputPath(e.target.value)}
										placeholder="Select output directory"
									/>
								</div>
								<button
									style={{
										backgroundColor: "var(--vscode-button-secondaryBackground)",
										color: "var(--vscode-button-secondaryForeground)",
										border: "1px solid var(--vscode-button-border)",
										borderRadius: "4px",
										padding: "8px 12px",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										fontSize: "13px",
										fontFamily: "inherit",
										outline: "none",
									}}
									onMouseOver={(e) => {
										(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryHoverBackground)"
									}}
									onMouseOut={(e) => {
										(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryBackground)"
									}}
									onFocus={(e) => {
										(e.target as HTMLButtonElement).style.outline = "1px solid var(--vscode-focusBorder)"
									}}
									onBlur={(e) => {
										(e.target as HTMLButtonElement).style.outline = "none"
									}}
									onClick={handleSelectOutputPath}
								>
									<span className="codicon codicon-folder-opened" style={{ marginRight: "6px" }}></span>
									Browse
								</button>
							</div>
							<div style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground)", marginTop: "2px" }}>
								Generated files will be saved to: {outputPath || "Not selected"}
							</div>
						</div>
					</div>
				)}

				{/* Generation Options */}
				<div style={{ marginBottom: "20px" }}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px" }}>Code Generation</h4>

					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						<button
							style={{
								width: "100%",
								backgroundColor: "var(--vscode-button-background)",
								color: "var(--vscode-button-foreground)",
								border: "1px solid var(--vscode-button-border)",
								borderRadius: "4px",
								padding: "12px 16px",
								cursor: !isValid || isLoading || !packageName.trim() || !outputPath.trim() ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "13px",
								fontFamily: "inherit",
								outline: "none",
								opacity: !isValid || isLoading || !packageName.trim() || !outputPath.trim() ? 0.5 : 1,
							}}
							onMouseOver={(e) => {
								if (!(!isValid || isLoading || !packageName.trim() || !outputPath.trim())) {
									(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-hoverBackground)"
								}
							}}
							onMouseOut={(e) => {
								if (!(!isValid || isLoading || !packageName.trim() || !outputPath.trim())) {
									(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-background)"
								}
							}}
							onFocus={(e) => {
								(e.target as HTMLButtonElement).style.outline = "1px solid var(--vscode-focusBorder)"
							}}
							onBlur={(e) => {
								(e.target as HTMLButtonElement).style.outline = "none"
							}}
							onClick={handleGenerateCode}
							disabled={!isValid || isLoading || !packageName.trim() || !outputPath.trim()}
						>
							{isLoading ? (
								<>
									         <ProgressRing className="mr-2 w-4 h-4" />
									Generating...
								</>
							) : (
								<>
									<span className="codicon codicon-gear" style={{ marginRight: "6px" }}></span>
									Generate CRUD Code
								</>
							)}
						</button>

						<button
							style={{
								width: "100%",
								backgroundColor: "var(--vscode-button-secondaryBackground)",
								color: "var(--vscode-button-secondaryForeground)",
								border: "1px solid var(--vscode-button-border)",
								borderRadius: "4px",
								padding: "12px 16px",
								cursor: !isValid || isLoading ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "13px",
								fontFamily: "inherit",
								outline: "none",
								opacity: !isValid || isLoading ? 0.5 : 1,
							}}
							onMouseOver={(e) => {
								if (!(!isValid || isLoading)) {
									(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryHoverBackground)"
								}
							}}
							onMouseOut={(e) => {
								if (!(!isValid || isLoading)) {
									(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryBackground)"
								}
							}}
							onFocus={(e) => {
								(e.target as HTMLButtonElement).style.outline = "1px solid var(--vscode-focusBorder)"
							}}
							onBlur={(e) => {
								(e.target as HTMLButtonElement).style.outline = "none"
							}}
							onClick={handleUploadTemplates}
							disabled={!isValid || isLoading}
						>
							<span className="codicon codicon-file-code" style={{ marginRight: "6px" }}></span>
							Generate with Custom Templates
						</button>

						<button
							style={{
								width: "100%",
								backgroundColor: "var(--vscode-button-secondaryBackground)",
								color: "var(--vscode-button-secondaryForeground)",
								border: "1px solid var(--vscode-button-border)",
								borderRadius: "4px",
								padding: "12px 16px",
								cursor: !isValid || isLoading ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "13px",
								fontFamily: "inherit",
								outline: "none",
								opacity: !isValid || isLoading ? 0.5 : 1,
							}}
							onMouseOver={(e) => {
								if (!(!isValid || isLoading)) {
									(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryHoverBackground)"
								}
							}}
							onMouseOut={(e) => {
								if (!(!isValid || isLoading)) {
									(e.target as HTMLButtonElement).style.backgroundColor = "var(--vscode-button-secondaryBackground)"
								}
							}}
							onFocus={(e) => {
								(e.target as HTMLButtonElement).style.outline = "1px solid var(--vscode-focusBorder)"
							}}
							onBlur={(e) => {
								(e.target as HTMLButtonElement).style.outline = "none"
							}}
							onClick={handleDownloadTemplateContext}
							disabled={!isValid || isLoading}
						>
							<span className="codicon codicon-json" style={{ marginRight: "6px" }}></span>
							Download Template Context
						</button>
					</div>

					<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: "10px" }}>
						<div>
							• <strong>Generate CRUD Code:</strong> Creates complete DAO, Service, Controller, and JSP files
						</div>
						<div>
							• <strong>Custom Templates:</strong> Upload your own Handlebars templates for code generation
						</div>
						<div>
							• <strong>Template Context:</strong> Download JSON context for creating custom templates
						</div>
					</div>
				</div>

				{/* Generated Code Types */}
				<div
					style={{
						backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
						padding: "15px",
						borderRadius: "4px",
						marginTop: "20px",
					}}>
					<h4 style={{ color: "var(--vscode-foreground)", marginBottom: "10px", marginTop: 0 }}>
						Generated Code Includes
					</h4>

					{/* Java Files */}
					<div style={{ marginBottom: "12px" }}>
						<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>Java Files:</strong>
						<ul
							style={{
								fontSize: "12px",
								color: "var(--vscode-foreground)",
								margin: "5px 0 0 0",
								paddingLeft: "20px",
							}}>
							<li>
								<strong>VO (Value Object):</strong> {parsedDDL?.tableName || "Table"}VO.java, DefaultVO.java
							</li>
							<li>
								<strong>Service Layer:</strong> {parsedDDL?.tableName || "Table"}Service.java,{" "}
								{parsedDDL?.tableName || "Table"}ServiceImpl.java
							</li>
							<li>
								<strong>Controller:</strong> {parsedDDL?.tableName || "Table"}Controller.java
							</li>
							<li>
								<strong>DAO:</strong> {parsedDDL?.tableName || "Table"}DAO.java
							</li>
							<li>
								<strong>Mapper Interface:</strong> {parsedDDL?.tableName || "Table"}Mapper.java
							</li>
						</ul>
					</div>

					{/* Configuration Files */}
					<div style={{ marginBottom: "12px" }}>
						<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>Configuration Files:</strong>
						<ul
							style={{
								fontSize: "12px",
								color: "var(--vscode-foreground)",
								margin: "5px 0 0 0",
								paddingLeft: "20px",
							}}>
							<li>
								<strong>MyBatis SQL Mapping:</strong> {parsedDDL?.tableName || "Table"}_SQL.xml
							</li>
						</ul>
					</div>

					{/* View Files */}
					<div style={{ marginBottom: "12px" }}>
						<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>View Templates:</strong>
						<ul
							style={{
								fontSize: "12px",
								color: "var(--vscode-foreground)",
								margin: "5px 0 0 0",
								paddingLeft: "20px",
							}}>
							<li>
								<strong>JSP Views:</strong> {parsedDDL?.tableName || "Table"}List.jsp,{" "}
								{parsedDDL?.tableName || "Table"}Regist.jsp
							</li>
							<li>
								<strong>Thymeleaf Views:</strong> {parsedDDL?.tableName || "Table"}List.html,{" "}
								{parsedDDL?.tableName || "Table"}Regist.html
							</li>
						</ul>
					</div>

					{/* Directory Structure */}
					{parsedDDL && (
						<div style={{ marginBottom: "12px" }}>
							<strong style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>Directory Structure:</strong>
							<div
								style={{
									fontSize: "11px",
									color: "var(--vscode-descriptionForeground)",
									margin: "5px 0 0 0",
									paddingLeft: "10px",
									fontFamily: "monospace",
								}}>
								<div>src/main/java/{packageName.replace(/\./g, "/")}/</div>
								<div style={{ paddingLeft: "10px" }}>├── web/ - Controllers</div>
								<div style={{ paddingLeft: "10px" }}>├── service/ - Services & VOs</div>
								<div style={{ paddingLeft: "10px" }}>└── service/impl/ - Service Implementations & DAOs</div>
								<div>src/main/resources/</div>
								<div style={{ paddingLeft: "10px" }}>├── egovframework/mapper/ - MyBatis XML</div>
								<div style={{ paddingLeft: "10px" }}>└── templates/ - Thymeleaf HTML</div>
								<div>src/main/webapp/WEB-INF/jsp/ - JSP Views</div>
							</div>
						</div>
					)}

					<div style={{ marginTop: "12px", fontSize: "12px", color: "var(--vscode-descriptionForeground)" }}>
						<strong>Handlebars Template Engine:</strong> Supports custom template creation with helpers like eq,
						concat, lowercase, unless, setVar, and error handling.
					</div>
				</div>
			</div>
		)
	} catch (renderError) {
		console.error("CodeView render error:", renderError)
		return (
			<div style={{ padding: "20px", color: "var(--vscode-errorForeground)" }}>
				<h3>Error rendering CodeView</h3>
				<p>An error occurred while rendering the component:</p>
				<pre>{String(renderError)}</pre>
			</div>
		)
	}
}

export default CodeView
