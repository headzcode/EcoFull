class EcoFull {
  static init(options = {}) {
    console.log('[EcoFull] Inicializando...');

    const config = {
      threshold: options.threshold || 0.1, // Intensidade do carregamento (0 a 1)
      rootMargin: options.rootMargin || '100px', // Margem de pré-carregamento
      placeholderClass: options.placeholderClass || 'ecofull-placeholder', // Classe do placeholder
      enableCache: options.enableCache || false, // Habilita cache local
      loadingAnimation: options.loadingAnimation || '<div class="ecofull-loading"></div>', // Animação de loading
      priority: options.priority || 'medium', // Prioridade de carregamento
    };

    console.log('[EcoFull] Configurações:', config);

    const elements = document.querySelectorAll('[data-ecofull]');
    console.log(`[EcoFull] ${elements.length} elementos encontrados para carregamento sob demanda.`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log(`[EcoFull] Elemento visível:`, entry.target);
            this.loadElement(entry.target, config);
            observer.unobserve(entry.target); // Para de observar após o carregamento
          }
        });
      },
      {
        threshold: config.threshold,
        rootMargin: config.rootMargin,
      }
    );

    elements.forEach((element) => {
      observer.observe(element); // Começa a observar cada elemento
    });
  }

  static loadElement(element, config) {
    const src = element.getAttribute('data-src');
    if (!src) {
      console.error('[EcoFull] Atributo "data-src" não encontrado no elemento:', element);
      return;
    }

    console.log(`[EcoFull] Carregando recurso: ${src}`);

    // Exibe a animação de loading
    element.innerHTML = config.loadingAnimation;

    // Verifica se o recurso já está em cache
    if (config.enableCache && this.getFromCache(src)) {
      console.log(`[EcoFull] Recurso encontrado no cache: ${src}`);
      this.renderElement(element, this.getFromCache(src));
      return;
    }

    // Carrega o recurso com base no tipo
    if (src.endsWith('.mp4') || src.endsWith('.webm')) {
      this.loadVideo(element, src, config);
    } else if (src.startsWith('http') || src.startsWith('//')) {
      this.loadIframe(element, src, config);
    } else {
      this.loadImage(element, src, config);
    }
  }

  static loadImage(element, src, config) {
    const img = new Image();
    img.src = src;
    img.alt = element.getAttribute('data-alt') || ''; // Atributo alt para acessibilidade
    img.onload = () => {
      console.log(`[EcoFull] Imagem carregada: ${src}`);
      this.renderElement(element, img);
      if (config.enableCache) this.saveToCache(src, img.outerHTML);
    };
    img.onerror = () => {
      console.error(`[EcoFull] Erro ao carregar a imagem: ${src}`);
    };
  }

  static loadVideo(element, src, config) {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.muted = true; // Vídeos autoplay precisam estar sem som
    video.setAttribute('aria-label', element.getAttribute('data-label') || ''); // Acessibilidade
    video.onloadeddata = () => {
      console.log(`[EcoFull] Vídeo carregado: ${src}`);
      this.renderElement(element, video);
      if (config.enableCache) this.saveToCache(src, video.outerHTML);
    };
    video.onerror = () => {
      console.error(`[EcoFull] Erro ao carregar o vídeo: ${src}`);
    };
  }

  static loadIframe(element, src, config) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.onload = () => {
      console.log(`[EcoFull] Iframe carregado: ${src}`);
      this.renderElement(element, iframe);
      if (config.enableCache) this.saveToCache(src, iframe.outerHTML);
    };
    iframe.onerror = () => {
      console.error(`[EcoFull] Erro ao carregar o iframe: ${src}`);
    };
  }

  static renderElement(element, content) {
    console.log(`[EcoFull] Renderizando elemento:`, element);
    element.innerHTML = ''; // Remove o placeholder ou loading
    element.appendChild(content);
  }

  static saveToCache(key, value) {
    console.log(`[EcoFull] Salvando no cache: ${key}`);
    localStorage.setItem(`ecofull-${key}`, value);
  }

  static getFromCache(key) {
    const cachedValue = localStorage.getItem(`ecofull-${key}`);
    if (cachedValue) {
      console.log(`[EcoFull] Recuperando do cache: ${key}`);
    }
    return cachedValue;
  }
}

// Inicializa a EcoFull automaticamente quando o script é carregado
document.addEventListener('DOMContentLoaded', () => {
  EcoFull.init({
    threshold: 0.1,
    rootMargin: '100px',
    placeholderClass: 'ecofull-placeholder',
    loadingAnimation: '<div class="ecofull-loading">Carregando...</div>',
    enableCache: true,
    priority: 'medium',
  });
});
