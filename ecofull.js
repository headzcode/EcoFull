class EcoFull {
  static version = '1.5.0';
  static supportsWebP = null;
  static networkInfo = { type: 'unknown', effectiveType: 'unknown', saveData: false };
  
  static init(options = {}) {
    console.log(`[EcoFull v${this.version}] Inicializando...`);
    
    this.detectFeatures();
    
    const config = {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '100px',
      placeholderClass: options.placeholderClass || options.placehohlderClass || 'ecofull-placeholder',
      loadingAnimation: options.loadingAnimation || '<div class="ecofull-loading">Carregando...</div>',
      errorFallback: options.errorFallback || '<div class="ecofull-error">Falha ao carregar</div>',
      enableCache: options.enableCache !== undefined ? options.enableCache : true,
      cacheStrategy: options.cacheStrategy || 'localStorage',
      priority: options.priority || 'auto',
      responsive: options.responsive !== undefined ? options.responsive : true,
      optimizeImages: options.optimizeImages !== undefined ? options.optimizeImages : true,
      retryOnError: options.retryOnError !== undefined ? options.retryOnError : true,
      maxRetries: options.maxRetries || 2,
      preloadNext: options.preloadNext !== undefined ? options.preloadNext : true,
      preconnect: options.preconnect !== undefined ? options.preconnect : true,
      debug: options.debug || false
    };
    
    console.log('[EcoFull] Configurações:', config);
    
    // Estabelecer preconnect para domínios externos
    if (config.preconnect) this.setupPreconnections();
    
    const elements = document.querySelectorAll('[data-ecofull]');
    console.log(`[EcoFull] ${elements.length} elementos encontrados.`);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadElement(entry.target, config);
            observer.unobserve(entry.target);
            
            // Pré-carregar próximo elemento 
            if (config.preloadNext) this.preloadNextElement(entry.target);
          }
        });
      },
      { threshold: config.threshold, rootMargin: config.rootMargin }
    );
    
    // Priorizar elementos visíveis primeiro
    if (config.priority === 'auto') {
      this.prioritizeElements(elements, observer);
    } else {
      elements.forEach(element => observer.observe(element));
    }
    
    // Adicionar listeners para eventos importantes
    this.setupEventListeners();
    
    return this;
  }
  
  static detectFeatures() {
    // Detectar suporte a WebP
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      this.supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    // Detectar informações de rede
    if ('connection' in navigator) {
      const conn = navigator.connection;
      if (conn) {
        this.networkInfo = {
          type: conn.type || 'unknown',
          effectiveType: conn.effectiveType || 'unknown',
          saveData: conn.saveData || false
        };
        
        conn.addEventListener('change', () => {
          this.networkInfo = {
            type: conn.type || 'unknown',
            effectiveType: conn.effectiveType || 'unknown',
            saveData: conn.saveData || false
          };
        });
      }
    }
  }
  
  static setupPreconnections() {
    const domains = new Set();
    
    document.querySelectorAll('[data-ecofull]').forEach(element => {
      const src = element.getAttribute('data-src');
      if (src && (src.startsWith('http') || src.startsWith('//'))) {
        try {
          const url = new URL(src, window.location.origin);
          domains.add(url.origin);
        } catch (e) {}
      }
    });
    
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
  
  static prioritizeElements(elements, observer) {
    // Dividir em elementos visíveis e não visíveis
    const visible = [];
    const hidden = [];
    
    elements.forEach(element => {
      if (this.isInViewport(element)) {
        visible.push(element);
      } else {
        hidden.push(element);
      }
    });
    
    // Observar visíveis imediatamente
    visible.forEach(element => observer.observe(element));
    
    // Observar não visíveis após pequeno atraso
    setTimeout(() => {
      hidden.forEach(element => observer.observe(element));
    }, 100);
  }
  
  static isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  static preloadNextElement(currentElement) {
    const elements = [...document.querySelectorAll('[data-ecofull]:not(.ecofull-loaded)')];
    const currentIndex = elements.indexOf(currentElement);
    
    if (currentIndex !== -1 && currentIndex < elements.length - 1) {
      const nextElement = elements[currentIndex + 1];
      const src = nextElement.getAttribute('data-src');
      
      if (src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        
        if (src.match(/\.(jpe?g|png|gif|webp|svg)$/i)) {
          link.as = 'image';
        } else if (src.match(/\.(mp4|webm|ogv)$/i)) {
          link.as = 'video';
        } else {
          link.as = 'fetch';
        }
        
        link.href = src;
        document.head.appendChild(link);
      }
    }
  }
  
  static setupEventListeners() {
    // Recarregar elementos quando a orientação muda
    window.addEventListener('orientationchange', () => {
      document.querySelectorAll('[data-ecofull].ecofull-loaded[data-responsive="true"]').forEach(element => {
        const src = this.getResponsiveSource(element);
        if (src) this.loadElement(element, null, true);
      });
    });
    
    // Melhorar quando a página fica visível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        document.querySelectorAll('[data-ecofull]:not(.ecofull-loaded)').forEach(element => {
          if (this.isInViewport(element)) {
            this.loadElement(element, null);
          }
        });
      }
    });
  }
  
  static loadElement(element, config, forceReload = false) {
    if (!config) {
      config = {
        enableCache: true,
        loadingAnimation: '<div class="ecofull-loading">Carregando...</div>',
        errorFallback: '<div class="ecofull-error">Falha ao carregar</div>',
        retryOnError: true,
        maxRetries: 2
      };
    }
    
    const src = element.getAttribute('data-src');
    if (!src) {
      console.error('[EcoFull] data-src não encontrado:', element);
      return;
    }
    
    if (element.classList.contains('ecofull-loaded') && !forceReload) return;
    
    console.log(`[EcoFull] Carregando: ${src}`);
    element.innerHTML = config.loadingAnimation;
    
    // Verificar cache
    if (config.enableCache && !forceReload) {
      const cached = this.getFromCache(src, config);
      if (cached) {
        element.innerHTML = cached;
        element.classList.add('ecofull-loaded');
        return;
      }
    }
    
    // Selecionar método de carregamento
    if (src.match(/\.(jpe?g|png|gif|webp|svg)$/i)) {
      this.loadImage(element, src, config);
    } else if (src.match(/\.(mp4|webm|ogv)$/i)) {
      this.loadVideo(element, src, config);
    } else if (src.startsWith('http') || src.startsWith('//')) {
      this.loadIframe(element, src, config);
    } else {
      this.loadOtherContent(element, src, config);
    }
  }
  
  static loadImage(element, src, config, retryCount = 0) {
    // Otimizar imagem com base no suporte e rede
    let optimizedSrc = src;
    
    if (config.optimizeImages) {
      // Usar WebP se suportado
      if (this.supportsWebP && src.match(/\.(jpe?g|png)$/i)) {
        if (element.hasAttribute('data-webp')) {
          optimizedSrc = element.getAttribute('data-webp');
        } else {
          optimizedSrc = src.replace(/\.(jpe?g|png)$/i, '.webp');
        }
      }
      
      // Usar versão de baixa qualidade em conexões lentas
      if (this.networkInfo.saveData || this.networkInfo.effectiveType === '2g') {
        if (element.hasAttribute('data-low-src')) {
          optimizedSrc = element.getAttribute('data-low-src');
        }
      }
      
      // Aplicar fonte responsiva se disponível
      if (config.responsive && element.hasAttribute('data-srcset')) {
        optimizedSrc = this.getResponsiveSource(element) || optimizedSrc;
      }
    }
    
    const img = new Image();
    
    // Acessibilidade
    img.alt = element.getAttribute('data-alt') || '';
    
    // Aplicar dimensões se fornecidas
    if (element.hasAttribute('data-width')) img.width = element.getAttribute('data-width');
    if (element.hasAttribute('data-height')) img.height = element.getAttribute('data-height');
    
    // Adicionar srcset para imagens responsivas
    if (element.hasAttribute('data-srcset')) img.srcset = element.getAttribute('data-srcset');
    if (element.hasAttribute('data-sizes')) img.sizes = element.getAttribute('data-sizes');
    
    // Adicionar classes personalizadas
    if (element.hasAttribute('data-class')) {
      img.className = element.getAttribute('data-class');
    }
    
    img.onload = () => {
      console.log(`[EcoFull] Imagem carregada: ${optimizedSrc}`);
      element.innerHTML = '';
      element.appendChild(img);
      element.classList.add('ecofull-loaded');
      
      if (config.enableCache) {
        this.saveToCache(src, img.outerHTML, config);
      }
    };
    
    img.onerror = () => {
      console.error(`[EcoFull] Erro ao carregar imagem: ${optimizedSrc}`);
      
      // Tentar novamente
      if (config.retryOnError && retryCount < config.maxRetries) {
        setTimeout(() => {
          this.loadImage(element, src, config, retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        element.innerHTML = config.errorFallback;
        element.classList.add('ecofull-error');
      }
    };
    
    img.src = optimizedSrc;
  }
  
  static getResponsiveSource(element) {
    // Se tiver data-srcset, usar valor apropriado
    if (element.hasAttribute('data-srcset')) {
      return null; // O navegador irá selecionar com base no srcset
    }
    
    // Se tiver data-responsive-src (JSON com breakpoints)
    if (element.hasAttribute('data-responsive-src')) {
      try {
        const sources = JSON.parse(element.getAttribute('data-responsive-src'));
        const width = window.innerWidth;
        
        const breakpoints = Object.keys(sources)
          .map(Number)
          .sort((a, b) => b - a);
        
        // Encontrar o breakpoint mais apropriado
        for (const breakpoint of breakpoints) {
          if (width >= breakpoint) {
            return sources[breakpoint];
          }
        }
        
        // Se nenhum corresponder, usar o menor
        if (breakpoints.length > 0) {
          return sources[breakpoints[breakpoints.length - 1]];
        }
      } catch (e) {
        console.error('[EcoFull] Erro ao analisar data-responsive-src:', e);
      }
    }
    
    return element.getAttribute('data-src');
  }
  
  static loadVideo(element, src, config, retryCount = 0) {
    const video = document.createElement('video');
    
    // Aplicar atributos
    video.controls = element.getAttribute('data-controls') !== 'false';
    video.autoplay = element.getAttribute('data-autoplay') === 'true';
    video.loop = element.getAttribute('data-loop') === 'true';
    video.muted = element.getAttribute('data-muted') !== 'false';
    video.playsInline = element.getAttribute('data-playsinline') !== 'false';
    
    // Acessibilidade
    video.setAttribute('aria-label', element.getAttribute('data-label') || '');
    
    // Pré-carregamento conforme rede
    video.preload = this.networkInfo.saveData ? 'none' : (element.getAttribute('data-preload') || 'metadata');
    
    // Usar fonte de baixa qualidade se conexão lenta
    if ((this.networkInfo.saveData || this.networkInfo.effectiveType === '2g') && element.hasAttribute('data-low-src')) {
      video.src = element.getAttribute('data-low-src');
    } else {
      video.src = src;
    }
    
    // Aplicar poster se disponível
    if (element.hasAttribute('data-poster')) {
      video.poster = element.getAttribute('data-poster');
    }
    
    // Aplicar dimensões
    if (element.hasAttribute('data-width')) video.width = element.getAttribute('data-width');
    if (element.hasAttribute('data-height')) video.height = element.getAttribute('data-height');
    
    // Aplicar classes personalizadas
    if (element.hasAttribute('data-class')) {
      video.className = element.getAttribute('data-class');
    }
    
    video.onloadeddata = () => {
      console.log(`[EcoFull] Vídeo carregado: ${src}`);
      element.innerHTML = '';
      element.appendChild(video);
      element.classList.add('ecofull-loaded');
      
      if (config.enableCache) {
        this.saveToCache(src, video.outerHTML, config);
      }
    };
    
    video.onerror = () => {
      console.error(`[EcoFull] Erro ao carregar vídeo: ${src}`);
      
      if (config.retryOnError && retryCount < config.maxRetries) {
        setTimeout(() => {
          this.loadVideo(element, src, config, retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        element.innerHTML = config.errorFallback;
        element.classList.add('ecofull-error');
      }
    };
  }
  
  static loadIframe(element, src, config, retryCount = 0) {
    const iframe = document.createElement('iframe');
    
    // Aplicar configurações básicas
    iframe.src = src;
    iframe.frameBorder = '0';
    iframe.allowFullscreen = element.getAttribute('data-fullscreen') !== 'false';
    
    // Configurações de carregamento
    iframe.loading = element.getAttribute('data-loading') || 'lazy';
    
    // Configurações de segurança
    if (element.hasAttribute('data-sandbox')) {
      iframe.sandbox = element.getAttribute('data-sandbox');
    }
    
    // Aplicar dimensões
    if (element.hasAttribute('data-width')) iframe.width = element.getAttribute('data-width');
    if (element.hasAttribute('data-height')) iframe.height = element.getAttribute('data-height');
    
    // Título para acessibilidade
    if (element.hasAttribute('data-title')) {
      iframe.title = element.getAttribute('data-title');
    }
    
    // Adicionar classes personalizadas
    if (element.hasAttribute('data-class')) {
      iframe.className = element.getAttribute('data-class');
    }
    
    iframe.onload = () => {
      console.log(`[EcoFull] iframe carregado: ${src}`);
      element.innerHTML = '';
      element.appendChild(iframe);
      element.classList.add('ecofull-loaded');
      
      if (config.enableCache) {
        this.saveToCache(src, iframe.outerHTML, config);
      }
    };
    
    iframe.onerror = () => {
      console.error(`[EcoFull] Erro ao carregar iframe: ${src}`);
      
      if (config.retryOnError && retryCount < config.maxRetries) {
        setTimeout(() => {
          this.loadIframe(element, src, config, retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        element.innerHTML = config.errorFallback;
        element.classList.add('ecofull-error');
      }
    };
  }
  
  static loadOtherContent(element, src, config) {
    fetch(src)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        return response.text();
      })
      .then(content => {
        element.innerHTML = content;
        element.classList.add('ecofull-loaded');
        
        if (config.enableCache) {
          this.saveToCache(src, content, config);
        }
      })
      .catch(error => {
        console.error(`[EcoFull] Erro ao carregar conteúdo: ${src}`, error);
        element.innerHTML = config.errorFallback;
        element.classList.add('ecofull-error');
      });
  }
  
  static saveToCache(key, value, config) {
    try {
      const cacheKey = `ecofull-${key}`;
      const cacheData = {
        content: value,
        timestamp: Date.now()
      };
      
      switch (config.cacheStrategy) {
        case 'localStorage':
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          break;
        case 'sessionStorage':
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
          break;
        default:
          // Cache em memória implementado via Map estático
          EcoFull.cache = EcoFull.cache || new Map();
          EcoFull.cache.set(cacheKey, cacheData);
      }
    } catch (error) {
      console.warn(`[EcoFull] Erro ao salvar no cache: ${error.message}`);
    }
  }
  
  static getFromCache(key, config) {
    try {
      const cacheKey = `ecofull-${key}`;
      let cacheData;
      
      switch (config.cacheStrategy) {
        case 'localStorage':
          cacheData = JSON.parse(localStorage.getItem(cacheKey));
          break;
        case 'sessionStorage':
          cacheData = JSON.parse(sessionStorage.getItem(cacheKey));
          break;
        default:
          // Cache em memória
          EcoFull.cache = EcoFull.cache || new Map();
          cacheData = EcoFull.cache.get(cacheKey);
      }
      
      if (cacheData) {
        // Verificar TTL se configurado
        if (config.cacheTTL && (Date.now() - cacheData.timestamp > config.cacheTTL)) {
          this.removeFromCache(key, config);
          return null;
        }
        
        return cacheData.content;
      }
      
      return null;
    } catch (error) {
      console.warn(`[EcoFull] Erro ao recuperar do cache: ${error.message}`);
      return null;
    }
  }
  
  static removeFromCache(key, config) {
    try {
      const cacheKey = `ecofull-${key}`;
      
      switch (config.cacheStrategy) {
        case 'localStorage':
          localStorage.removeItem(cacheKey);
          break;
        case 'sessionStorage':
          sessionStorage.removeItem(cacheKey);
          break;
        default:
          // Cache em memória
          EcoFull.cache = EcoFull.cache || new Map();
          EcoFull.cache.delete(cacheKey);
      }
    } catch (error) {
      console.warn(`[EcoFull] Erro ao remover do cache: ${error.message}`);
    }
  }
  
  // Métodos utilitários
  static clearCache() {
    const prefix = 'ecofull-';
    
    // Limpar localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    
    // Limpar sessionStorage
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {}
    
    // Limpar cache em memória
    if (EcoFull.cache) {
      EcoFull.cache.clear();
    }
    
    console.log('[EcoFull] Cache limpo com sucesso');
  }
}

// Inicializa a EcoFull automaticamente quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  EcoFull.init({
    threshold: 0.1,
    rootMargin: '100px',
    placeholderClass: 'ecofull-placeholder',
    loadingAnimation: '<div class="ecofull-loading">Carregando...</div>',
    enableCache: true,
    priority: 'auto',
    optimizeImages: true,
    retryOnError: true,
    maxRetries: 2
  });
});
