class EcoFull {
  constructor() {
    this.elements = document.querySelectorAll('.ecofull');
    this.init();
  }

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadElement(entry.target);
          observer.unobserve(entry.target); // Para de observar após o carregamento
        }
      });
    }, { threshold: 0.1 }); // Configuração do observador

    this.elements.forEach((element) => {
      observer.observe(element); // Começa a observar cada elemento
    });
  }

  loadElement(element) {
    const src = element.getAttribute('data-src');
    if (src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        element.innerHTML = ''; // Remove o placeholder
        element.appendChild(img); // Adiciona a imagem carregada
      };
    }
  }
}

// Inicializa a EcoFull quando a página carrega
window.onload = () => {
  new EcoFull();
};
