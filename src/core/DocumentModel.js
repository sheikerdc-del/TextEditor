class DocumentModel {
    constructor() {
        this.nodes = [];
        this.version = 1;
    }
    
    createNode(type, content, attributes = {}) {
        return {
            id: this.generateId(),
            type,
            content,
            attributes,
            children: []
        };
    }
    
    addNode(node, parentId = null) {
        if (parentId) {
            const parent = this.findNode(parentId);
            if (parent) {
                parent.children.push(node);
            }
        } else {
            this.nodes.push(node);
        }
        this.version++;
        return node.id;
    }
    
    findNode(id) {
        const search = (nodes) => {
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.children.length > 0) {
                    const found = search(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        
        return search(this.nodes);
    }
    
    updateNode(id, updates) {
        const node = this.findNode(id);
        if (node) {
            Object.assign(node, updates);
            this.version++;
            return true;
        }
        return false;
    }
    
    removeNode(id) {
        const removeFrom = (nodes) => {
            const index = nodes.findIndex(node => node.id === id);
            if (index !== -1) {
                nodes.splice(index, 1);
                return true;
            }
            
            for (const node of nodes) {
                if (removeFrom(node.children)) {
                    return true;
                }
            }
            
            return false;
        };
        
        const removed = removeFrom(this.nodes);
        if (removed) this.version++;
        return removed;
    }
    
    toHTML() {
        const serialize = (node) => {
            switch (node.type) {
                case 'text':
                    return node.content;
                case 'element':
                    const attrs = Object.entries(node.attributes)
                        .map(([key, value]) => ` ${key}="${value}"`)
                        .join('');
                    const children = node.children.map(serialize).join('');
                    return `<${node.content}${attrs}>${children}</${node.content}>`;
                case 'root':
                    return node.children.map(serialize).join('');
                default:
                    return '';
            }
        };
        
        return serialize({ type: 'root', children: this.nodes });
    }
    
    fromHTML(html) {
        // Упрощенный парсер HTML для демонстрации
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const parseElement = (element) => {
            const node = this.createNode('element', element.tagName.toLowerCase());
            
            // Атрибуты
            for (const attr of element.attributes) {
                node.attributes[attr.name] = attr.value;
            }
            
            // Дети
            for (const child of element.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    if (child.textContent.trim()) {
                        node.children.push(this.createNode('text', child.textContent));
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    node.children.push(parseElement(child));
                }
            }
            
            return node;
        };
        
        this.nodes = Array.from(doc.body.childNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .map(parseElement);
        
        this.version++;
    }
    
    generateId() {
        return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getVersion() {
        return this.version;
    }
}
