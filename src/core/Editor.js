class Editor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            container: '#editorContainer',
            mode: 'visual',
            sanitize: true,
            ...options
        };
        
        this.container = typeof this.options.container === 'string' 
            ? document.querySelector(this.options.container) 
            : this.options.container;
            
        this.mode = this.options.mode;
        this.isDirty = false;
        
        this.init();
    }
    
    init() {
        this.initElements();
        this.initModules();
        this.switchMode(this.mode);
    }
    
    initElements() {
        this.visualEditor = this.container.querySelector('#visualEditor');
        this.htmlEditor = this.container.querySelector('#htmlEditor');
        this.bbcodeEditor = this.container.querySelector('#bbcodeEditor');
        this.toolbar = this.container.querySelector('#toolbar');
        this.sidebar = this.container.querySelector('#sidebar');
        this.statusBar = this.container.querySelector('.status-bar');
        
        this.documentModel = new DocumentModel();
        this.commandManager = new CommandManager(this);
    }
    
    initModules() {
        this.bbcodeParser = new BBCodeParser();
        this.htmlSanitizer = new HTMLSanitizer();
        this.commandManager = new CommandManager(this);
        this.imageManager = new ImageManager(this);
        this.stylePresets = new StylePresets(this);
        this.exportManager = new ExportManager(this);
        this.toolbarManager = new EnhancedToolbar(this);
        
        this.setupPresetShortcuts();
        this.setupAutoSave();
    }

    setupPresetShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.stylePresets.applyPreset('neutral');
                        break;
                    case '2':
                        e.preventDefault();
                        this.stylePresets.applyPreset('accent');
                        break;
                    case '3':
                        e.preventDefault();
                        this.stylePresets.applyPreset('success');
                        break;
                    case '4':
                        e.preventDefault();
                        this.stylePresets.applyPreset('warning');
                        break;
                    case '5':
                        e.preventDefault();
                        this.stylePresets.applyPreset('error');
                        break;
                    case '6':
                        e.preventDefault();
                        this.stylePresets.applyPreset('info');
                        break;
                }
            }
        });
    }

    setupAutoSave() {
        this.on('change', Helpers.debounce(() => {
            this.exportManager.saveToStorage('editor-autosave');
        }, 2000));
        
        window.addEventListener('beforeunload', () => {
            this.exportManager.saveToStorage('editor-autosave');
        });
        
        setTimeout(() => {
            this.exportManager.loadFromStorage('editor-autosave');
        }, 100);
    }
    
    execCommand(command, value = null) {
        if (this.mode !== 'visual') return;
        
        try {
            this.commandManager.execute('format', { command, value });
            this.visualEditor.focus();
            this.markDirty();
        } catch (error) {
            console.error('Command execution failed:', error);
        }
    }
    
    switchMode(mode) {
        this.visualEditor.style.display = 'none';
        this.htmlEditor.style.display = 'none';
        this.bbcodeEditor.style.display = 'none';
        
        this.container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        this.mode = mode;
        switch (mode) {
            case 'visual':
                this.visualEditor.style.display = 'block';
                this.visualEditor.focus();
                break;
            case 'html':
                this.htmlEditor.style.display = 'block';
                this.htmlEditor.focus();
                this.syncToHTML();
                break;
            case 'bbcode':
                this.bbcodeEditor.style.display = 'block';
                this.bbcodeEditor.focus();
                this.syncToBBCode();
                break;
        }
        
        this.updateStatus();
        this.emit('modeChange', mode);
    }
    
    syncModes() {
        if (this.mode === 'visual') {
            this.syncToHTML();
            this.syncToBBCode();
        }
    }
    
    syncToHTML() {
        const content = this.visualEditor.innerHTML;
        this.htmlEditor.value = this.htmlSanitizer.sanitize(content);
    }
    
    syncFromHTML() {
        const content = this.htmlEditor.value;
        this.visualEditor.innerHTML = this.htmlSanitizer.sanitize(content);
        this.syncToBBCode();
    }
    
    syncToBBCode() {
        const content = this.visualEditor.innerHTML;
        this.bbcodeEditor.value = this.bbcodeParser.toBBCode(content);
    }
    
    syncFromBBCode() {
        const content = this.bbcodeEditor.value;
        this.visualEditor.innerHTML = this.bbcodeParser.toHTML(content);
        this.syncToHTML();
    }
    
    handleKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    this.execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.execCommand('underline');
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.commandManager.redo();
                    } else {
                        this.commandManager.undo();
                    }
                    break;
            }
        }
        
        if (e.altKey && e.key >= '1' && e.key <= '3') {
            e.preventDefault();
            const modes = ['visual', 'html', 'bbcode'];
            this.switchMode(modes[parseInt(e.key) - 1]);
        }
    }
    
    updateToolbarState() {
        this.container.querySelectorAll('[data-command]').forEach(btn => {
            const command = btn.dataset.command;
            try {
                const isActive = document.queryCommandState(command);
                btn.classList.toggle('active', isActive);
            } catch (e) {
            }
        });
    }
    
    updateStatus() {
        const text = this.getTextContent();
        const charCount = text.length;
        this.container.querySelector('.char-count').textContent = `${charCount} символов`;
        
        const modeNames = {
            visual: 'Визуальный режим',
            html: 'HTML режим',
            bbcode: 'BBCode режим'
        };
        this.container.querySelector('.mode-indicator').textContent = modeNames[this.mode];
    }
    
    markDirty() {
        this.isDirty = true;
        this.emit('change');
    }
    
    getTextContent() {
        switch (this.mode) {
            case 'visual': return this.visualEditor.textContent || '';
            case 'html': return this.htmlEditor.value;
            case 'bbcode': return this.bbcodeEditor.value;
            default: return '';
        }
    }
    
    getHTML() {
        return this.htmlSanitizer.sanitize(this.visualEditor.innerHTML);
    }
    
    getBBCode() {
        return this.bbcodeParser.toBBCode(this.visualEditor.innerHTML);
    }
    
    setContent(content, type = 'html') {
        switch (type) {
            case 'html':
                this.visualEditor.innerHTML = this.htmlSanitizer.sanitize(content);
                break;
            case 'bbcode':
                this.visualEditor.innerHTML = this.bbcodeParser.toHTML(content);
                break;
        }
        this.syncModes();
        this.markDirty();
    }

    // Public API методы
    getContent(format = 'html', options = {}) {
        switch (format) {
            case 'html':
                return this.exportManager.getHTML(options);
            case 'bbcode':
                return this.exportManager.getBBCode(options);
            case 'text':
                return this.exportManager.getText(options);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    setContent(content, format = 'html', options = {}) {
        return this.exportManager.setContent(content, format, options);
    }

    insertToPage(container, options = {}) {
        return this.exportManager.insertToPage(container, options);
    }

    async copyToClipboard(format = 'html', options = {}) {
        return this.exportManager.copyToClipboard(format, options);
    }

    addImage(source, type = 'file', options = {}) {
        switch (type) {
            case 'file':
                return this.imageManager.addImageFromFile(source);
            case 'url':
                return this.imageManager.addImageFromURL(source);
            default:
                throw new Error(`Unsupported image type: ${type}`);
        }
    }

    getImages() {
        return this.imageManager.getAllImages();
    }

    removeImage(imageId) {
        const imageData = this.imageManager.getImageMetadata(imageId);
        if (imageData && imageData.element) {
            imageData.element.remove();
            this.imageManager.images.delete(imageId);
            this.markDirty();
            return true;
        }
        return false;
    }

    applyStyle(presetName, options = {}) {
        return this.stylePresets.applyPreset(presetName, options);
    }

    createStylePreset(name, styles, options = {}) {
        return this.stylePresets.createCustomPreset(name, styles, options);
    }

    getStylePresets() {
        return this.stylePresets.getPresets();
    }

    setMode(mode) {
        if (['visual', 'html', 'bbcode'].includes(mode)) {
            this.switchMode(mode);
            return true;
        }
        return false;
    }

    getMode() {
        return this.mode;
    }

    undo() {
        return this.commandManager.undo();
    }

    redo() {
        return this.commandManager.redo();
    }

    canUndo() {
        return this.commandManager.canUndo();
    }

    canRedo() {
        return this.commandManager.canRedo();
    }

    clearHistory() {
        return this.commandManager.clear();
    }

    save(key) {
        return this.exportManager.saveToStorage(key);
    }

    load(key) {
        return this.exportManager.loadFromStorage(key);
    }

    exportSettings() {
        return this.exportManager.exportSettings();
    }

    importSettings(jsonString) {
        return this.exportManager.importSettings(jsonString);
    }

    setOptions(options) {
        this.exportManager.setExportOptions(options);
    }

    getOptions() {
        return this.exportManager.getExportOptions();
    }

    destroy() {
        this.events = {};
        this.commandManager.clear();
        
        const styleElement = document.getElementById('editor-preset-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        const exportStyleElement = document.getElementById('editor-export-styles');
        if (exportStyleElement) {
            exportStyleElement.remove();
        }
        
        this.emit('destroyed');
        
        this.visualEditor = null;
        this.htmlEditor = null;
        this.bbcodeEditor = null;
        this.toolbar = null;
        this.sidebar = null;
        this.statusBar = null;
    }
}
