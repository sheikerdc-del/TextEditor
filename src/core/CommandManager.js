class CommandManager {
    constructor(editor) {
        this.editor = editor;
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = 100;
        this.batchOperations = 0;
        this.batchStack = [];
    }

    execute(command, data) {
        if (this.batchOperations > 0 && this.batchStack.length > 0) {
            this.batchStack[this.batchStack.length - 1].push({ command, data });
            return;
        }

        const commandObj = new EditorCommand(command, data, this.editor);
        
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        
        commandObj.execute();
        
        this.history.push(commandObj);
        this.currentIndex++;
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.currentIndex--;
        }
        
        this.editor.emit('historyChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
    }

    undo() {
        if (this.canUndo()) {
            this.history[this.currentIndex].undo();
            this.currentIndex--;
            this.editor.emit('historyChange', {
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });
        }
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            this.history[this.currentIndex].execute();
            this.editor.emit('historyChange', {
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });
        }
    }

    canUndo() {
        return this.currentIndex >= 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    startBatch() {
        this.batchOperations++;
        this.batchStack.push([]);
    }

    endBatch() {
        if (this.batchOperations > 0) {
            this.batchOperations--;
            const batchCommands = this.batchStack.pop();
            
            if (batchCommands && batchCommands.length > 0) {
                const batchCommand = new BatchCommand(batchCommands, this.editor);
                
                if (this.currentIndex < this.history.length - 1) {
                    this.history = this.history.slice(0, this.currentIndex + 1);
                }
                
                this.history.push(batchCommand);
                this.currentIndex++;
                
                if (this.history.length > this.maxHistory) {
                    this.history.shift();
                    this.currentIndex--;
                }
            }
        }
    }

    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.editor.emit('historyChange', {
            canUndo: false,
            canRedo: false
        });
    }
}

class EditorCommand {
    constructor(command, data, editor) {
        this.command = command;
        this.data = data;
        this.editor = editor;
        this.previousState = null;
        this.newState = null;
    }

    execute() {
        this.saveState('before');
        
        switch (this.command) {
            case 'format':
                document.execCommand(this.data.command, false, this.data.value);
                break;
            case 'insertHTML':
                document.execCommand('insertHTML', false, this.data.html);
                break;
            case 'delete':
                document.execCommand('delete', false, null);
                break;
            case 'style':
                this.applyStyle();
                break;
        }
        
        this.saveState('after');
        this.editor.syncModes();
    }

    undo() {
        if (this.previousState) {
            this.restoreState(this.previousState);
            this.editor.syncModes();
        }
    }

    applyStyle() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
            const span = document.createElement('span');
            span.style.cssText = this.data.style;
            span.textContent = selectedText;
            
            range.deleteContents();
            range.insertNode(span);
        }
    }

    saveState(when) {
        const state = {
            html: this.editor.visualEditor.innerHTML,
            selection: this.saveSelection()
        };
        
        if (when === 'before') {
            this.previousState = state;
        } else {
            this.newState = state;
        }
    }

    restoreState(state) {
        this.editor.visualEditor.innerHTML = state.html;
        this.restoreSelection(state.selection);
    }

    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return null;
        
        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(this.editor.visualEditor);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        
        const start = preSelectionRange.toString().length;
        const end = start + range.toString().length;
        
        return { start, end };
    }

    restoreSelection(selection) {
        if (!selection) return;
        
        const textNodes = this.getTextNodes(this.editor.visualEditor);
        let charIndex = 0;
        let startNode = null, startOffset = 0;
        let endNode = null, endOffset = 0;
        
        for (const node of textNodes) {
            const length = node.textContent.length;
            
            if (!startNode && charIndex + length >= selection.start) {
                startNode = node;
                startOffset = selection.start - charIndex;
            }
            
            if (!endNode && charIndex + length >= selection.end) {
                endNode = node;
                endOffset = selection.end - charIndex;
                break;
            }
            
            charIndex += length;
        }
        
        if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    getTextNodes(node) {
        const textNodes = [];
        
        function traverse(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                textNodes.push(node);
            } else {
                for (const child of node.childNodes) {
                    traverse(child);
                }
            }
        }
        
        traverse(node);
        return textNodes;
    }
}

class BatchCommand {
    constructor(commands, editor) {
        this.commands = commands.map(cmd => new EditorCommand(cmd.command, cmd.data, editor));
        this.editor = editor;
    }

    execute() {
        this.commands.forEach(cmd => cmd.execute());
    }

    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}
