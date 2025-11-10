// CSS crítico inline mínimo para above-the-fold
// Script inline para diferir CSS no crítico ANTES del parse
export default function CriticalCSS() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  // Ejecutar inmediatamente, antes de que el navegador parse el resto del HTML
  if (document.readyState === 'loading') {
    // Diferir todos los CSS no críticos usando media="print"
    const deferCSS = function() {
      var links = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
      links.forEach(function(link) {
        if (link.media && link.media !== 'all' && link.media !== '') return;
        link.media = 'print';
        link.setAttribute('data-deferred', 'true');
        link.onload = function() {
          this.media = 'all';
        };
        // Fallback para navegadores que no disparan onload
        setTimeout(function() {
          if (link.media === 'print') {
            link.media = 'all';
          }
        }, 100);
      });
    };
    
    // Ejecutar tan pronto como sea posible
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', deferCSS, false);
    }
    // Fallback inmediato
    deferCSS();
  } else {
    // Si ya está cargado, ejecutar inmediatamente
    var links = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
    links.forEach(function(link) {
      if (link.media && link.media !== 'all' && link.media !== '') return;
      link.media = 'print';
      link.setAttribute('data-deferred', 'true');
      link.onload = function() {
        this.media = 'all';
      };
      setTimeout(function() {
        if (link.media === 'print') {
          link.media = 'all';
        }
      }, 100);
    });
  }
})();
`,
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
:root{--vh:100dvh;--safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px)}
html,body{height:100%;margin:0;padding:0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#fff;color:#111827}
*{-webkit-tap-highlight-color:transparent}
.min-h-screen{min-height:100vh}
.bg-white{background-color:#fff}
.text-gray-900{color:#111827}
.flex{display:flex}
.flex-col{flex-direction:column}
.border-b{border-bottom:1px solid #e5e7eb}
.sticky{position:sticky}
.top-0{top:0}
.z-40{z-index:40}
.max-w-6xl{max-width:72rem;margin:0 auto}
.p-4{padding:1rem}
.gap-4{gap:1rem}
.items-center{align-items:center}
.justify-between{justify-content:space-between}
.text-sm{font-size:0.875rem}
.bg-gradient-to-br{background:linear-gradient(to bottom right,#2563eb,#1e40af)}
.text-white{color:#fff}
.py-20{padding-top:5rem;padding-bottom:5rem}
.px-4{padding-left:1rem;padding-right:1rem}
.text-center{text-align:center}
.text-4xl{font-size:2.25rem;line-height:2.5rem;font-weight:700}
.mb-6{margin-bottom:1.5rem}
.text-xl{font-size:1.25rem;line-height:1.75rem}
.mb-8{margin-bottom:2rem}
.flex-col{flex-direction:column}
@media(min-width:640px){.sm\\:flex-row{flex-direction:row}}
.justify-center{justify-content:center}
.rounded-lg{border-radius:0.5rem}
.hover\\:bg-gray-100:hover{background-color:#f3f4f6}
.text-lg{font-size:1.125rem;line-height:1.75rem}
.px-8{padding-left:2rem;padding-right:2rem}
.py-3{padding-top:0.75rem;padding-bottom:0.75rem}
.hidden{display:none}
@media(min-width:768px){.md\\:block{display:block}}
.min-h-\\[44px\\]{min-height:44px}
`,
        }}
      />
    </>
  );
}



