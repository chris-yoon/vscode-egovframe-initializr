import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs-extra"
import extract from "extract-zip"
import * as Handlebars from "handlebars"

export interface EgovProjectTemplate {
	displayName: string
	fileName: string
	pomFile: string
}

export interface EgovProjectConfig {
	projectName: string
	groupID: string
	outputPath: string
	template: EgovProjectTemplate
}

export interface EgovProjectGenerationResult {
	success: boolean
	message: string
	projectPath?: string
	error?: string
}

/**
 * Generate eGovFrame project from template
 */
export async function generateEgovProject(
	config: EgovProjectConfig,
	extensionPath: string,
	progressCallback?: (message: string) => void,
): Promise<EgovProjectGenerationResult> {
	try {
		progressCallback?.("📦 Preparing project generation...")

		// Validate configuration
		const validationResult = validateProjectConfig(config)
		if (!validationResult.isValid) {
			return {
				success: false,
				message: "Configuration validation failed",
				error: validationResult.errors.join(", "),
			}
		}

		// Setup paths
		const zipFilePath = path.join(extensionPath, "egovframe-pack", "examples", config.template.fileName)
		const projectRoot = path.join(config.outputPath, config.projectName)

		progressCallback?.("📁 Creating project directory...")

		// Check if project directory already exists
		if (await fs.pathExists(projectRoot)) {
			return {
				success: false,
				message: "Project directory already exists",
				error: `Directory ${projectRoot} already exists`,
			}
		}

		// Ensure output directory exists
		await fs.ensureDir(config.outputPath)

		progressCallback?.("📦 Extracting template files...")

		// Check if template zip file exists
		if (!(await fs.pathExists(zipFilePath))) {
			return {
				success: false,
				message: "Template file not found",
				error: `Template file ${zipFilePath} does not exist`,
			}
		}

		// Extract template
		await extract(zipFilePath, { dir: projectRoot })

		progressCallback?.("⚙️ Configuring project...")

		// Generate POM file if template has one
		if (config.template.pomFile) {
			await generatePomFile(config, extensionPath, projectRoot, progressCallback)
		}

		progressCallback?.("✅ Project generation completed!")

		return {
			success: true,
			message: `Project ${config.projectName} created successfully`,
			projectPath: projectRoot,
		}
	} catch (error) {
		return {
			success: false,
			message: "Project generation failed",
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

/**
 * Generate Maven POM file with project configuration
 */
async function generatePomFile(
	config: EgovProjectConfig,
	extensionPath: string,
	projectRoot: string,
	progressCallback?: (message: string) => void,
): Promise<void> {
	try {
		progressCallback?.("📝 Generating Maven POM file...")

		const templatePath = path.join(extensionPath, "egovframe-pack", "templates", "project", config.template.pomFile)
		const outputPath = path.join(projectRoot, "pom.xml")

		// Check if POM template exists
		if (!(await fs.pathExists(templatePath))) {
			throw new Error(`POM template not found: ${templatePath}`)
		}

		// Read template content
		const templateContent = await fs.readFile(templatePath, "utf-8")

		// Compile and render template
		const template = Handlebars.compile(templateContent)
		const renderedContent = template({
			groupID: config.groupID,
			projectName: config.projectName,
		})

		// Write POM file
		await fs.writeFile(outputPath, renderedContent)

		progressCallback?.("📝 Maven POM file generated successfully")
	} catch (error) {
		throw new Error(`Failed to generate POM file: ${error}`)
	}
}

/**
 * Validate project configuration
 */
function validateProjectConfig(config: EgovProjectConfig): { isValid: boolean; errors: string[] } {
	const errors: string[] = []

	// Validate project name
	if (!config.projectName || config.projectName.trim() === "") {
		errors.push("Project name is required")
	} else if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(config.projectName)) {
		errors.push("Project name must start with a letter and contain only letters, numbers, hyphens, and underscores")
	}

	// Validate group ID if POM file is required
	if (config.template.pomFile && (!config.groupID || config.groupID.trim() === "")) {
		errors.push("Group ID is required for this template")
	} else if (config.groupID && !/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(config.groupID)) {
		errors.push("Group ID must be a valid Java package name")
	}

	// Validate output path
	if (!config.outputPath || config.outputPath.trim() === "") {
		errors.push("Output path is required")
	}

	// Validate template
	if (!config.template) {
		errors.push("Template selection is required")
	}

	return {
		isValid: errors.length === 0,
		errors,
	}
}

/**
 * Get available eGovFrame project templates
 */
export async function getAvailableTemplates(extensionPath: string): Promise<EgovProjectTemplate[]> {
	try {
		const templatesConfigPath = path.join(extensionPath, "egovframe-pack", "templates-projects.json")

		if (await fs.pathExists(templatesConfigPath)) {
			const templatesData = await fs.readJSON(templatesConfigPath)
			return templatesData
		} else {
			// Fallback to default templates if config file not found
			return getDefaultTemplates()
		}
	} catch (error) {
		console.warn("Failed to load templates config, using defaults:", error)
		return getDefaultTemplates()
	}
}

/**
 * Get default templates if config file is not available
 */
function getDefaultTemplates(): EgovProjectTemplate[] {
	return [
		{
			displayName: "eGovFrame Web Project",
			fileName: "example-web.zip",
			pomFile: "example-web-pom.xml",
		},
		{
			displayName: "eGovFrame Template Project > Simple Homepage",
			fileName: "example-template-simple.zip",
			pomFile: "example-template-simple-pom.xml",
		},
		{
			displayName: "eGovFrame Boot Web Project",
			fileName: "example-boot-web.zip",
			pomFile: "example-boot-web-pom.xml",
		},
	]
}

/**
 * Start interactive project generation workflow using VS Code UI
 */
export async function startInteractiveProjectGeneration(
	extensionPath: string,
	progressCallback?: (message: string) => void,
): Promise<void> {
	try {
		progressCallback?.("🚀 Starting interactive project generation...")

		// Step 1: Select category
		const categories = ["All", "Web", "Template", "Mobile", "Boot", "MSA", "Batch"]
		const selectedCategory = await vscode.window.showQuickPick(categories, {
			placeHolder: "Select project category",
			ignoreFocusOut: true,
		})

		if (!selectedCategory) {
			progressCallback?.("❌ Generation cancelled - no category selected")
			return
		}

		progressCallback?.(`📁 Category selected: ${selectedCategory}`)

		// Step 2: Get templates for category
		const allTemplates = await getAvailableTemplates(extensionPath)
		const filteredTemplates =
			selectedCategory === "All"
				? allTemplates
				: allTemplates.filter((t) => t.displayName.toLowerCase().includes(selectedCategory.toLowerCase()))

		if (filteredTemplates.length === 0) {
			vscode.window.showWarningMessage(`No templates found for category: ${selectedCategory}`)
			return
		}

		// Step 3: Select template
		const templateItems = filteredTemplates.map((template) => ({
			label: template.displayName,
			description: template.fileName,
			detail: `POM: ${template.pomFile || "Not required"}`,
			template,
		}))

		const selectedTemplateItem = await vscode.window.showQuickPick(templateItems, {
			placeHolder: `Select template from ${filteredTemplates.length} available`,
			matchOnDescription: true,
			matchOnDetail: true,
			ignoreFocusOut: true,
		})

		if (!selectedTemplateItem) {
			progressCallback?.("❌ Generation cancelled - no template selected")
			return
		}

		progressCallback?.(`📦 Template selected: ${selectedTemplateItem.template.displayName}`)

		// Step 4: Enter project name
		const projectName = await vscode.window.showInputBox({
			prompt: "Enter project name",
			placeHolder: "my-egov-project",
			validateInput: (value) => {
				if (!value || value.trim() === "") {
					return "Project name is required"
				}
				if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
					return "Project name must start with a letter and contain only letters, numbers, hyphens, and underscores"
				}
				return null
			},
			ignoreFocusOut: true,
		})

		if (!projectName) {
			progressCallback?.("❌ Generation cancelled - no project name entered")
			return
		}

		progressCallback?.(`✏️ Project name: ${projectName}`)

		// Step 5: Enter Group ID (if needed)
		let groupID = ""
		if (selectedTemplateItem.template.pomFile) {
			groupID =
				(await vscode.window.showInputBox({
					prompt: "Enter Maven Group ID",
					placeHolder: "egovframework.example.sample",
					value: "egovframework.example.sample",
					validateInput: (value) => {
						if (!value || value.trim() === "") {
							return "Group ID is required for this template"
						}
						if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(value)) {
							return "Group ID must be a valid Java package name"
						}
						return null
					},
					ignoreFocusOut: true,
				})) || ""

			if (!groupID) {
				progressCallback?.("❌ Generation cancelled - no group ID entered")
				return
			}

			progressCallback?.(`🏷️ Group ID: ${groupID}`)
		}

		// Step 6: Select output path
		const outputPathOptions: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: false,
			canSelectFolders: true,
			openLabel: "Select Output Directory",
			title: "Select where to create the project",
		}

		const outputPathResult = await vscode.window.showOpenDialog(outputPathOptions)
		if (!outputPathResult || outputPathResult.length === 0) {
			progressCallback?.("❌ Generation cancelled - no output path selected")
			return
		}

		const outputPath = outputPathResult[0].fsPath
		progressCallback?.(`📂 Output path: ${outputPath}`)

		// Step 7: Confirm generation
		const confirmMessage = `Generate eGovFrame project with the following settings?

Project Name: ${projectName}
Template: ${selectedTemplateItem.template.displayName}
${groupID ? `Group ID: ${groupID}` : ""}
Output Path: ${outputPath}

The project will be created at: ${path.join(outputPath, projectName)}`

		const confirmed = await vscode.window.showInformationMessage(
			confirmMessage,
			{ modal: true },
			"Generate Project",
			"Cancel",
		)

		if (confirmed !== "Generate Project") {
			progressCallback?.("❌ Generation cancelled by user")
			return
		}

		// Step 8: Generate project
		const config: EgovProjectConfig = {
			projectName,
			groupID,
			outputPath,
			template: selectedTemplateItem.template,
		}

		const result = await generateEgovProject(config, extensionPath, progressCallback)

		if (result.success) {
			progressCallback?.("✅ Interactive generation completed successfully!")

			// Offer to open project
			const openProject = await vscode.window.showInformationMessage(
				`✅ eGovFrame project "${projectName}" created successfully!`,
				"Open Project",
				"Open in New Window",
				"Show in Explorer",
			)

			if (openProject === "Open Project") {
				await openProjectInVSCode(result.projectPath!)
			} else if (openProject === "Open in New Window") {
				const projectUri = vscode.Uri.file(result.projectPath!)
				await vscode.commands.executeCommand("vscode.openFolder", projectUri, {
					forceNewWindow: true,
				})
			} else if (openProject === "Show in Explorer") {
				await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(result.projectPath!))
			}
		} else {
			progressCallback?.(`❌ Interactive generation failed: ${result.error}`)
			vscode.window.showErrorMessage(`Failed to generate project: ${result.error}`)
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		progressCallback?.(`❌ Interactive generation error: ${errorMessage}`)
		vscode.window.showErrorMessage(`Interactive generation failed: ${errorMessage}`)
	}
}

/**
 * Open project in VS Code
 */
export async function openProjectInVSCode(projectPath: string): Promise<void> {
	const projectUri = vscode.Uri.file(projectPath)
	await vscode.commands.executeCommand("vscode.openFolder", projectUri, {
		forceNewWindow: false,
	})
}
