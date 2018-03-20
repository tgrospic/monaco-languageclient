/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2017 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import Uri from 'vscode-uri';
import { IConnection, TextDocuments, createConnection } from 'vscode-languageserver';
import { Command } from "vscode-languageserver-types";
import { ExecuteCommandParams, CodeActionParams } from 'vscode-base-languageclient/lib/protocol';
// import * as fs from "fs";
// import { MessageReader, MessageWriter } from "vscode-jsonrpc";
// import {
//     TextDocument, Diagnostic, Command, CompletionList, CompletionItem, Hover,
//     SymbolInformation, DocumentSymbolParams, TextEdit
// } from "vscode-languageserver-types";
// import { TextDocumentPositionParams, DocumentRangeFormattingParams, ExecuteCommandParams, CodeActionParams } from 'vscode-base-languageclient/lib/protocol';

import { spawn, ChildProcess } from 'child_process';
import * as rpc from "vscode-ws-jsonrpc";

export function startRhoServer(socket: rpc.IWebSocket): RholangServer {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    const connection = createConnection(reader, writer);
    const server = new RholangServer(connection);
    server.start();
    return server;
}

export class RholangServer {

    protected workspaceRoot: Uri | undefined;

    protected readonly documents = new TextDocuments();

    protected readonly pendingValidationRequests = new Map<string, number>();

    readonly _vm : ChildProcess;

    constructor(
        protected readonly connection: IConnection
    ) {
        const log = (msg: any) => {
          console.log(msg);
          // Log to browser console
          this.connection.console.log(msg);
        };

        // Start RhoVM (REPL)
        log('Rholang VM starting...');
        this._vm = spawn('docker', ['run', '-i', '--rm', 'rchain/rholang-cli']);

        // Listen for compiler result from RhoVM (REPL)
        this._vm.stdout.on('data', (data: String) => {
          // For this example it's RosetteVM :)
          const result = `${data}`.replace(/rosette> $/g, '');
          log(result);
        });

        this.documents.listen(this.connection);

        this.connection.onShutdown(() => {
            // Cleanup. For each request new Rholang session, as Docker container, isolation?
            // Note: closing socket doesn't fire this event (or onExit)?
            this._vm.kill();
        });

        this.connection.onInitialize(params => {
            if (params.rootPath) {
                this.workspaceRoot = Uri.file(params.rootPath);
            } else if (params.rootUri) {
                this.workspaceRoot = Uri.parse(params.rootUri);
            }
            this.connection.console.log("The server is initialized.");
            return {
                capabilities: {
                    textDocumentSync: this.documents.syncKind,
                    codeActionProvider: true,
                    completionProvider: {
                        resolveProvider: false,
                        triggerCharacters: ['"', ':']
                    },
                    hoverProvider: false,
                    documentSymbolProvider: false,
                    documentRangeFormattingProvider: false,
                    executeCommandProvider: {
                        commands: ['rho.run_contract']
                    }
                }
            }
        });
        this.connection.onCodeAction(params =>
            this.codeAction(params)
        );
        this.connection.onExecuteCommand(params =>
            this.executeCommand(params)
        );
    }

    start() {
        this.connection.listen();
    }

    protected codeAction(params: CodeActionParams): Command[] {
        return [{
            title: "Run contract",
            command: "rho.run_contract",
            // Send a VersionedTextDocumentIdentifier
            arguments: [{
                ...params.textDocument,
                version: this.documents.get(params.textDocument.uri).version
            }]
        }];
    }

    protected executeCommand(params: ExecuteCommandParams): any {
        if (params.command === "rho.run_contract" && params.arguments) {
            const versionedTextDocumentIdentifier = params.arguments[0];
            const docText = this.documents.get(versionedTextDocumentIdentifier.uri).getText();

            // Send source code to RhoVM (REPL)
            this._vm.stdin.write(docText);

            this.connection.workspace.applyEdit({
                documentChanges: [{
                    textDocument: versionedTextDocumentIdentifier,
                    edits: [{
                        range: {
                            start: {line: 0, character: 0},
                            end: {line: Number.MAX_SAFE_INTEGER, character: Number.MAX_SAFE_INTEGER}
                        },

                        // Return updated document (e.g. format, rename, ...)
                        newText: this.documents.get(versionedTextDocumentIdentifier.uri).getText()
                    }]
                }]
            });
        }
    }

}
