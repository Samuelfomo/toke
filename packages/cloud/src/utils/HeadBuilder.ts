// utils/HeadBuilder.ts
type HeadOptions = {
  title: string;
  css?: string[];
  scripts?: string[];
  meta?: { [key: string]: string };
};

class HeadBuilder {
  static apply(options: HeadOptions): void {
    // Nettoyer les anciens tags dynamiques
    document.querySelectorAll("head link[data-dynamic], head script[data-dynamic], head meta[data-dynamic]")
      .forEach(el => el.remove());

    // Title
    document.title = options.title;

    // Meta
    if (options.meta) {
      Object.entries(options.meta).forEach(([name, content]) => {
        const meta = document.createElement("meta");
        meta.setAttribute("name", name);
        meta.setAttribute("content", content);
        meta.setAttribute("data-dynamic", "true");
        document.head.appendChild(meta);
      });
    }

    // main.css
    const mainCss = document.createElement("link");
    mainCss.rel = "stylesheet";
    mainCss.href = "main.css";
    mainCss.setAttribute("data-dynamic", "true");
    document.head.appendChild(mainCss);

    // CSS spécifiques
    options.css?.forEach(file => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = file;
      link.setAttribute("data-dynamic", "true");
      document.head.appendChild(link);
    });

    // Scripts externes
    options.scripts?.forEach(src => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.setAttribute("data-dynamic", "true");
      document.head.appendChild(script);
    });
  }
}

export default HeadBuilder;
