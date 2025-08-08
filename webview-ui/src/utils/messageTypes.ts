import { TemplateContext } from "./templateContext"

export interface GenerateCodeMessage {
	type: "generateCode"
	ddl: string
	packageName?: string
	outputPath?: string
}

export interface UploadTemplatesMessage {
	type: "uploadTemplates"
	ddl: string
}

export interface DownloadTemplateContextMessage {
	type: "downloadTemplateContext"
	ddl: string
	context: TemplateContext
}

export interface InsertSampleDDLMessage {
	type: "insertSampleDDL"
}

export interface GetWorkspacePathMessage {
	type: "getWorkspacePath"
}

export interface SelectOutputPathMessage {
	type: "selectOutputPath"
}

export type WebviewMessage =
	| GenerateCodeMessage
	| UploadTemplatesMessage
	| DownloadTemplateContextMessage
	| InsertSampleDDLMessage
	| GetWorkspacePathMessage
	| SelectOutputPathMessage

export interface ErrorResponse {
	type: "error"
	message: string
}

export interface SuccessResponse {
	type: "success"
	message: string
}

export interface SampleDDLResponse {
	type: "sampleDDL"
	ddl: string
}

export interface SelectedOutputPathResponse {
	type: "selectedOutputPath"
	text: string
}

export interface CurrentWorkspacePathResponse {
	type: "currentWorkspacePath"
	text: string
}

export type ExtensionResponse =
	| ErrorResponse
	| SuccessResponse
	| SampleDDLResponse
	| SelectedOutputPathResponse
	| CurrentWorkspacePathResponse
