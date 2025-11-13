class StylePresets {
    constructor(editor) {
        this.editor = editor;
        this.presets = this.getDefaultPresets();
        this.customPresets = new Map();
        
        this.init();
    }

    init() {
        this.setupPresetHandlers();
        this.injectStyles();
    }

    getDefaultPresets() {
        return {
            neutral: {
                name: 'Нейтральная',
                styles: {
                    backgroundColor: '#6c757d',
                    color: '#ffffff',
                    padding: '0.5em 0.75em',
                    borderRadius: '0.375em',
                    fontWeight: '500'
                },
                class: 'preset-neutral'
            },
            accent: {
                name: 'Акцентная',
                styles: {
                    backgroundColor: '#007bff',
                    color: '#ffffff',
                    padding: '0.5em 0.75em',
                    borderRadius: '0.375em',
                    fontWeight: '500'
                },
                class: 'preset-accent'
            },
            success: {
                name: 'Успех',
                styles: {
                    backgroundColor: '#28a745',
                    color: '#ffffff',
                    padding: '0.5em 0.75em',
                    borderRadius: '0.375em',
                    fontWeight: '500'
                },
                class: 'preset-success'
            },
            warning: {
                name: 'Предупреждение',
                styles: {
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    padding: '0.5em 0.75em',
                    borderRadius: '0.375em',
                    fontWeight: '500'
                },
                class: 'preset-warning'
            },
            error: {
                name: 'Ошибка',
                styles: {
                    backgroundColor: '#dc3545',
                    color: '#ffffff',
                    padding: '0.5em 0.75em',
                    borderRadius: '0.375em',
                    fontWeight: '500'
                },
                class: 'preset-error'
            },
            info: {
                name: 'Информация',
                styles: {
                    backgroundColor: '#17a2b8',
                    color: '#ffffff',
                    padding: '0.5em 0.75em',
                    borderRadius: '0.375em',
                    fontWeight: '500'
                },
                class: 'preset-info'
            },
            card: {
                name: 'Карточка',
                styles: {
                    backgroundColor: '#ffffff',
                    color: '#333333',
                    padding: '1.5em',
                    borderRadius: '0.5em',
                    border: '1px solid #dee2e6',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                    margin: '1em 0'
                },
                class: 'preset-card',
                block: true
            },
            badge: {
                name: 'Бейдж',
                styles: {
                    backgroundColor: '#e9ecef',
                    color: '#495057',
                    padding: '0.25em 0.5em',
                    borderRadius: '0.25em',
                    fontSize: '0.875em',
                    fontWeight: '600'
                },
                class: 'preset-badge'
            },
            quote: {
                name: 'Цитата',
                styles: {
                    backgroundColor: '#f8f9fa',
                    color: '#6c757d',
                    padding: '1em 1.5em',
                    borderRadius: '0.375em',
                    borderLeft: '4px solid #007bff',
                    fontStyle: 'italic',
                    margin: '1em 0'
                },
                class: 'preset-quote',
                block: true
            }
        };
    }

    setupPresetHandlers() {
        const sidebar = this.editor.container.querySelector('#sidebar');
        if (!sidebar) return;

        sidebar.addEventListener('click', (e) => {
            const presetEl = e.target.closest('.preset');
            if (presetEl && presetEl.dataset.style) {
                this.applyPreset(presetEl.dataset.style);
            }
        });

        sidebar.addEventListener('contextmenu', (e) => {
            const presetEl = e.target.closest('.preset');
            if (presetEl && presetEl.dataset.style) {
                e.preventDefault();
                this.showPresetMenu(e.clientX, e.clientY, presetEl.dataset.style);
            }
        });
    }

    injectStyles() {
        if (document.getElementById('editor-preset-styles')) return;

        const style = document.createElement('style');
        style.id = 'editor-preset-styles';
        
        let css = '';
        Object.values(this.presets).forEach(preset => {
            css += `.${preset.class} { ${this.stylesToString(preset.styles)} }\n`;
        });

        style.textContent = css;
        document.head.appendChild(style);
    }

    applyPreset(presetName, options = {}) {
        const preset = this.presets[presetName] || this.customPresets.get(presetName);
        if (!preset) return;

        if (preset.block) {
            this.applyBlockPreset(preset);
        } else {
            this.applyInlinePreset(preset);
        }

        this.editor.markDirty();
        this.editor.emit('presetApplied', { preset: presetName, options });
    }

    applyInlinePreset(preset) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0 || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (!selectedText.trim()) return;

        const span = document.createElement('span');
        span.className = preset.class;
        span.style.cssText = this.stylesToString(preset.styles);
        span.textContent = selectedText;

        range.deleteContents();
        range.insertNode(span);

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
    }

    applyBlockPreset(preset) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        let blockElement = range.commonAncestorContainer;

        while (blockElement && blockElement.nodeType !== Node.ELEMENT_NODE) {
            blockElement = blockElement.parentElement;
        }

        if (!blockElement) return;

        const wrapper = document.createElement('div');
        wrapper.className = preset.class;
        wrapper.style.cssText = this.stylesToString(preset.styles);

        const content = blockElement.cloneNode(true);
        wrapper.appendChild(content);

        blockElement.parentNode.replaceChild(wrapper, blockElement);

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);
    }

    createCustomPreset(name, styles, options = {}) {
        const presetId = `custom_${Date.now()}`;
        const preset = {
            name,
            styles,
            class: `preset-${presetId}`,
            block: options.block || false,
            custom: true
        };

        this.customPresets.set(presetId, preset);
        this.injectCustomPresetStyle(preset);
        this.addPresetToSidebar(presetId, preset);

        return presetId;
    }

    injectCustomPresetStyle(preset) {
        const style = document.getElementById('editor-preset-styles');
        if (style) {
            style.textContent += `.${preset.class} { ${this.stylesToString(preset.styles)} }\n`;
        }
    }

    addPresetToSidebar(presetId, preset) {
        const sidebar = this.editor.container.querySelector('.style-presets');
        if (!sidebar) return;

        const presetEl = document.createElement('div');
        presetEl.className = 'preset custom-preset';
        presetEl.dataset.style = presetId;
        presetEl.textContent = preset.name;
        presetEl.style.cssText = this.stylesToString(preset.styles);

        sidebar.appendChild(presetEl);
    }

    showPresetMenu(x, y, presetName) {
        const menu = document.createElement('div');
        menu.className = 'preset-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.padding = '0.5em';
        menu.style.zIndex = '10000';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

        menu.innerHTML = `
            <div class="menu-item" data-action="apply">Применить к выделению</div>
            <div class="menu-item" data-action="apply-block">Применить как блок</div>
            <hr>
            <div class="menu-item" data-action="edit">Редактировать пресет</div>
            <div class="menu-item" data-action="duplicate">Дублировать</div>
            ${this.presets[presetName]?.custom ? 
                '<div class="menu-item" data-action="delete">Удалить пресет</div>' : ''}
        `;

        menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (menuItem) {
                this.handlePresetMenuAction(menuItem.dataset.action, presetName);
            }
            menu.remove();
        });

        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        });

        document.body.appendChild(menu);
    }

    handlePresetMenuAction(action, presetName) {
        switch (action) {
            case 'apply':
                this.applyPreset(presetName);
                break;
            case 'apply-block':
                this.applyPreset(presetName, { forceBlock: true });
                break;
            case 'edit':
                this.editPreset(presetName);
                break;
            case 'duplicate':
                this.duplicatePreset(presetName);
                break;
            case 'delete':
                this.deletePreset(presetName);
                break;
        }
    }

    editPreset(presetName) {
        const preset = this.presets[presetName] || this.customPresets.get(presetName);
        if (!preset) return;

        const newStyles = prompt('Редактируйте CSS стили:', this.stylesToString(preset.styles));
        if (newStyles) {
            preset.styles = this.parseStyles(newStyles);
            this.updatePresetStyle(preset);
            this.editor.emit('presetUpdated', { preset: presetName });
        }
    }

    duplicatePreset(presetName) {
        const original = this.presets[presetName] || this.customPresets.get(presetName);
        if (!original) return;

        const newName = prompt('Название нового пресета:', `${original.name} (копия)`);
        if (newName) {
            this.createCustomPreset(newName, { ...original.styles }, { 
                block: original.block 
            });
        }
    }

    deletePreset(presetName) {
        if (confirm('Удалить этот пресет?')) {
            this.customPresets.delete(presetName);
            this.removePresetFromSidebar(presetName);
            this.editor.emit('presetDeleted', { preset: presetName });
        }
    }

    removePresetFromSidebar(presetName) {
        const sidebar = this.editor.container.querySelector('.style-presets');
        const presetEl = sidebar.querySelector(`[data-style="${presetName}"]`);
        if (presetEl) {
            presetEl.remove();
        }
    }

    updatePresetStyle(preset) {
        const style = document.getElementById('editor-preset-styles');
        if (style) {
            const newStyle = `.${preset.class} { ${this.stylesToString(preset.styles)} }`;
            const regex = new RegExp(`\\.${preset.class}[^{]*{[^}]*}`, 'g');
            style.textContent = style.textContent.replace(regex, newStyle);
        }
    }

    stylesToString(styles) {
        return Object.entries(styles)
            .map(([key, value]) => `${Helpers.camelToKebab(key)}: ${value};`)
            .join(' ');
    }

    parseStyles(cssString) {
        const styles = {};
        const declarations = cssString.split(';').filter(dec => dec.trim());
        
        declarations.forEach(declaration => {
            const [property, value] = declaration.split(':').map(part => part.trim());
            if (property && value) {
                styles[Helpers.kebabToCamel(property)] = value;
            }
        });
        
        return styles;
    }

    getPresets() {
        return {
            ...this.presets,
            ...Object.fromEntries(this.customPresets)
        };
    }

    exportPresets() {
        return JSON.stringify({
            default: this.presets,
            custom: Object.fromEntries(this.customPresets)
        }, null, 2);
    }

    importPresets(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.custom) {
                Object.entries(data.custom).forEach(([id, preset]) => {
                    this.customPresets.set(id, preset);
                    this.injectCustomPresetStyle(preset);
                    this.addPresetToSidebar(id, preset);
                });
            }
            
            this.editor.emit('presetsImported');
        } catch (error) {
            console.error('Error importing presets:', error);
        }
    }
}
