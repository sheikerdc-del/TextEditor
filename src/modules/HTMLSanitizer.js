class HTMLSanitizer {
    constructor() {
        this.allowedTags = new Set([
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr', 'div', 'span',
            'strong', 'em', 'b', 'i', 'u', 's',
            'blockquote', 'pre', 'code',
            'ul', 'ol', 'li',
            'a', 'img',
            'table', 'thead', 'tbody', 'tr', 'td', 'th'
        ]);

        this.allowedAttributes = {
            '*': ['class', 'style'],
            'a': ['href', 'title', 'rel', 'target'],
            'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
            'span': ['style'],
            'div': ['style'],
            'table': ['border', 'cellpadding', 'cellspacing'],
            'td': ['colspan', 'rowspan']
        };

        this.allowedStyles = [
            'color', 'background-color', 'font-size', 'font-weight',
            'font-family', 'text-decoration', 'text-align',
            'padding', 'margin', 'border', 'border-radius',
            'width', 'height', 'max-width', 'max-height',
            'display', 'float', 'position', 'top', 'left', 'right', 'bottom',
            'z-index', 'opacity'
        ];

        this.forbiddenStyles = [
            'position:fixed', 'position:absolute', 'z-index:9999'
        ];
    }

    sanitize(html) {
        if (!html) return '';
        
        const doc = new DOMParser().parseFromString(html, 'text/html');
        this.cleanNode(doc.body);
        
        return doc.body.innerHTML;
    }

    cleanNode(node) {
        const nodesToRemove = [];
        
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                
                if (!this.allowedTags.has(tagName)) {
                    while (child.firstChild) {
                        node.insertBefore(child.firstChild, child);
                    }
                    nodesToRemove.push(child);
                    continue;
                }
                
                this.cleanAttributes(child, tagName);
                this.cleanStyles(child);
                this.cleanNode(child);
                
            } else if (child.nodeType === Node.TEXT_NODE) {
                continue;
            } else {
                nodesToRemove.push(child);
            }
        }
        
        nodesToRemove.forEach(node => node.remove());
    }

    cleanAttributes(element, tagName) {
        const attributes = Array.from(element.attributes);
        
        for (const attr of attributes) {
            const attrName = attr.name.toLowerCase();
            
            const allowedForTag = this.allowedAttributes[tagName] || [];
            const allowedGlobal = this.allowedAttributes['*'] || [];
            const isAllowed = allowedForTag.includes(attrName) || allowedGlobal.includes(attrName);
            
            if (!isAllowed) {
                element.removeAttribute(attrName);
                continue;
            }
            
            if (attrName === 'href' || attrName === 'src') {
                if (!this.isSafeURL(attr.value)) {
                    element.removeAttribute(attrName);
                }
            }
            
            if (attrName === 'style') {
                continue;
            }
            
            if (tagName === 'a' && attrName === 'href') {
                if (!element.hasAttribute('rel')) {
                    element.setAttribute('rel', 'noopener nofollow');
                }
                if (!element.hasAttribute('target')) {
                    element.setAttribute('target', '_blank');
                }
            }
        }
    }

    cleanStyles(element) {
        if (!element.hasAttribute('style')) return;
        
        const style = element.getAttribute('style');
        const declarations = style.split(';').filter(dec => dec.trim());
        const allowedDeclarations = [];
        
        for (const declaration of declarations) {
            const [property, value] = declaration.split(':').map(part => part.trim());
            if (!property || !value) continue;
            
            const normalizedProperty = property.toLowerCase();
            const normalizedValue = value.toLowerCase();
            
            if (!this.allowedStyles.includes(normalizedProperty)) {
                continue;
            }
            
            const styleDeclaration = `${normalizedProperty}:${normalizedValue}`;
            if (this.forbiddenStyles.some(forbidden => styleDeclaration.includes(forbidden))) {
                continue;
            }
            
            if (normalizedProperty === 'background-color' || normalizedProperty === 'color') {
                if (!this.isValidColor(normalizedValue)) {
                    continue;
                }
            }
            
            allowedDeclarations.push(`${property}: ${value}`);
        }
        
        if (allowedDeclarations.length > 0) {
            element.setAttribute('style', allowedDeclarations.join('; '));
        } else {
            element.removeAttribute('style');
        }
    }

    isSafeURL(url) {
        if (!url) return false;
        
        try {
            const parsed = new URL(url, window.location.href);
            
            const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
            if (dangerousProtocols.some(proto => parsed.protocol.toLowerCase().startsWith(proto))) {
                return false;
            }
            
            return true;
        } catch {
            return true;
        }
    }

    isValidColor(color) {
        if (!color) return false;
        
        if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) return true;
        
        if (/^rgb(a)?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) return true;
        
        if (/^hsl(a)?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) return true;
        
        const colorNames = [
            'black', 'white', 'red', 'green', 'blue', 'yellow', 
            'orange', 'purple', 'pink', 'brown', 'gray', 'grey'
        ];
        if (colorNames.includes(color.toLowerCase())) return true;
        
        return false;
    }
}
