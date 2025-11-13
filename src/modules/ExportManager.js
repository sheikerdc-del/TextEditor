class ExportManager {
    constructor(editor) {
        this.editor = editor;
        this.exportOptions = {
            sanitize: true,
            includeStyles: false,
            preserveImages: true,
            format: 'html'
        };
    }

    getHTML(options = {}) {
        const opts = { ...this.exportOptions, ...options };
        let html = this.editor.visualEditor.innerHTML;
        
        if (opts.sanitize) {
            html = this.editor.htmlSanitizer.sanitize(html);
        }
        
        if (opts.cleanup) {
            html = this.cleanupHTML(html);
        }
        
        if (opts.includeStyles) {
            html = this.injectStyles(html);
        }
        
        this.editor.emit('export', { format: 'html', content: html, options: opts });
        return html;
    }

    getBBCode(options = {}) {
        const opts = { ...this.exportOptions, ...options };
        const html = this.getHTML({ ...opts, format: 'bbcode' });
        const bbcode = this.editor.bbcodeParser.toBBCode(html);
        
        this.editor.emit('export', { format: 'bbcode', content: bbcode, options: opts });
        return bbcode;
    }

    getText(options = {}) {
        const opts = { ...this.exportOptions, ...options };
        let text = this.editor.visualEditor.textContent || '';
        
        if (opts.preserveLines) {
            text = text.replace(/\n\s*\n/g, '\n\n');
        }
        
        this.editor.emit('export', { format: 'text', content: text, options: opts });
        return text;
    }

    insertToPage(container, options = {}) {
        const opts = { ...this.exportOptions, ...options };
        const content = this.getHTML(opts);
        
        let targetContainer;
        if (typeof container === 'string') {
            targetContainer = document.querySelector(container);
        } else {
            targetContainer = container;
        }
        
        if (!targetContainer) {
            throw new Error('Target container not found');
        }
        
        targetContainer.innerHTML = content;
        
        if (opts.includeStyles) {
            this.injectStylesToPage();
        }
        
        this.editor.emit('insertToPage', { container: targetContainer, content, options: opts });
        return targetContainer;
    }

    async copyToClipboard(format = 'html', options = {}) {
        let content;
        
        switch (format) {
            case 'html':
                content = this.getHTML(options);
                break;
            case 'bbcode':
                content = this.getBBCode(options);
                break;
            case 'text':
                content = this.getText(options);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        try {
            await navigator.clipboard.writeText(content);
            this.editor.emit('copyToClipboard', { format, content, options });
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return this.fallbackCopyToClipboard(content);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                this.editor.emit('copyToClipboard', { format: 'text', content: text });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Fallback copy failed:', error);
            document.body.removeChild(textArea);
            return false;
        }
    }

    setContent(content, format = 'html', options = {}) {
        const opts = { ...this.exportOptions, ...options };
        
        switch (format) {
            case 'html':
                this.editor.visualEditor.innerHTML = opts.sanitize 
                    ? this.editor.htmlSanitizer.sanitize(content)
                    : content;
                break;
                
            case 'bbcode':
                const html = this.editor.bbcodeParser.toHTML(content);
                this.editor.visualEditor.innerHTML = opts.sanitize
                    ? this.editor.htmlSanitizer.sanitize(html)
                    : html;
                break;
                
            case 'text':
                this.editor.visualEditor.textContent = content;
                break;
                
            default:
                throw new Error(`Unsupported import format: ${format}`);
        }
        
        this.editor.syncModes();
        this.editor.markDirty();
        this.editor.emit('contentImported', { format, content, options: opts });
    }

    cleanupHTML(html) {
        const tempAttributes = ['contenteditable', 'data-image-id', 'data-temp'];
        const tempClasses = ['selected', 'image-wrapper'];
        
        let cleaned = html;
        
        tempAttributes.forEach(attr => {
            const regex = new RegExp(`\\s*${attr}="[^"]*"`, 'g');
            cleaned = cleaned.replace(regex, '');
        });
        
        tempClasses.forEach(className => {
            const regex = new RegExp(`\\s*${className}`, 'g');
            cleaned = cleaned.replace(regex, '');
        });
        
        cleaned = cleaned.replace(/class="\s*"/g, '');
        cleaned = cleaned.replace(/style="\s*"/g, '');
        
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    }

    injectStyles(html) {
        const styles = this.getEditorStyles();
        return `<style>${styles}</style>\n${html}`;
    }

    injectStylesToPage() {
        if (document.getElementById('editor-export-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'editor-export-styles';
        style.textContent = this.getEditorStyles();
        document.head.appendChild(style);
    }

    getEditorStyles() {
        const styles = `
            .preset-neutral, .preset-accent, .preset-success, 
            .preset-warning, .preset-error, .preset-info,
            .preset-card, .preset-badge, .preset-quote {
                display: inline-block;
                margin: 0.125em;
            }
            
            .preset-card, .preset-quote {
                display: block;
                margin: 1em 0;
            }
            
            .preset-neutral { background: #6c757d; color: white; padding: 0.5em 0.75em; border-radius: 0.375em; font-weight: 500; }
            .preset-accent { background: #007bff; color: white; padding: 0.5em 0.75em; border-radius: 0.375em; font-weight: 500; }
            .preset-success { background: #28a745; color: white; padding: 0.5em 0.75em; border-radius: 0.375em; font-weight: 500; }
            .preset-warning { background: #ffc107; color: black; padding: 0.5em 0.75em; border-radius: 0.375em; font-weight: 500; }
            .preset-error { background: #dc3545; color: white; padding: 0.5em 0.75em; border-radius: 0.375em; font-weight: 500; }
            .preset-info { background: #17a2b8; color: white; padding: 0.5em 0.75em; border-radius: 0.375em; font-weight: 500; }
            .preset-card { background: white; color: #333; padding: 1.5em; border-radius: 0.5em; border: 1px solid #dee2e6; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }
            .preset-badge { background: #e9ecef; color: #495057; padding: 0.25em 0.5em; border-radius: 0.25em; font-size: 0.875em; font-weight: 600; }
            .preset-quote { background: #f8f9fa; color: #6c757d; padding: 1em 1.5em; border-radius: 0.375em; border-left: 4px solid #007bff; font-style: italic; }
        `;
        
        return styles;
    }

    exportSettings() {
        const settings = {
            content: this.getHTML({ cleanup: true }),
            images: this.editor.imageManager.getAllImages(),
            presets: this.editor.stylePresets.exportPresets(),
            exportOptions: this.exportOptions,
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0'
            }
        };
        
        return JSON.stringify(settings, null, 2);
    }

    importSettings(jsonString) {
        try {
            const settings = JSON.parse(jsonString);
            
            if (settings.content) {
                this.setContent(settings.content, 'html');
            }
            
            if (settings.exportOptions) {
                this.exportOptions = { ...this.exportOptions, ...settings.exportOptions };
            }
            
            if (settings.presets) {
                this.editor.stylePresets.importPresets(settings.presets);
            }
            
            this.editor.emit('settingsImported', { settings });
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    saveToStorage(key = 'editor-content') {
        const data = {
            content: this.getHTML(),
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.editor.emit('savedToStorage', { key, data });
            return true;
        } catch (error) {
            console.error('Failed to save to storage:', error);
            return false;
        }
    }

    loadFromStorage(key = 'editor-content') {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.content) {
                this.setContent(data.content, 'html');
                this.editor.emit('loadedFromStorage', { key, data });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load from storage:', error);
            return false;
        }
    }

    setExportOptions(options) {
        this.exportOptions = { ...this.exportOptions, ...options };
    }

    getExportOptions() {
        return { ...this.exportOptions };
    }
}
