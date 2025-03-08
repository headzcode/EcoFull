class EcoFull {
  static init(options = {}) {
    const config = {
      threshold: options.threshold || 0.1, // Intensidade do carregamento (0 a 1)
      rootMargin: options.rootMargin || '100px', // Margem de pré-carregamento
      placeholderClass: options.placeholderClass || 'ecofull-placeholder', // Classe do placeholder
      enableCache: options.enableCache || false, // Habilita cache local
    };

    const elements = document.querySelectorAll('[data-ecofull]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
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
    if (!src) return;

    // Verifica se o recurso já está em cache
    if (config.enableCache && this.getFromCache(src)) {
      this.renderElement(element, this.getFromCache(src));
      return;
    }

    // Carrega o recurso
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
    img.onload = () => {
      this.renderElement(element, img);
      if (config.enableCache) this.saveToCache(src, img.outerHTML);
    };
    img.onerror = () => {
      console.error(`Erro ao carregar a imagem: ${src}`);
    };
  }

  static loadVideo(element, src, config) {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.muted = true; // Vídeos autoplay precisam estar sem som
    video.onloadeddata = () => {
      this.renderElement(element, video);
      if (config.enableCache) this.saveToCache(src, video.outerHTML);
    };
    video.onerror = () => {
      console.error(`Erro ao carregar o vídeo: ${src}`);
    };
  }

  static loadIframe(element, src, config) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.onload = () => {
      this.renderElement(element, iframe);
      if (config.enableCache) this.saveToCache(src, iframe.outerHTML);
    };
    iframe.onerror = () => {
      console.error(`Erro ao carregar o iframe: ${src}`);
    };
  }

  static renderElement(element, content) {
    element.innerHTML = ''; // Remove o placeholder
    element.appendChild(content);
  }

  static saveToCache(key, value) {
    localStorage.setItem(`ecofull-${key}`, value);
  }

  static getFromCache(key) {
    return localStorage.getItem(`ecofull-${key}`);
  }
}

// Inicializa a EcoFull automaticamente quando o script é carregado
document.addEventListener('DOMContentLoaded', () => {
  EcoFull.init();
});
