const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { parse } = require('url');

const DIST_DIR = path.join(__dirname, '../dist/ng-unrender-landing-page/browser');
const PORT = 8765;

// All routes to prerender
const ROUTES = ['/', '/inicio', '/sobre', '/loja', '/ecossistema', '/politica'];

// Simple static file server
function createStaticServer(root) {
  return http.createServer((req, res) => {
    const parsedUrl = parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Handle SPA routing - serve index.html for all routes
    let filePath = path.join(root, pathname === '/' ? 'index.html' : pathname);
    
    // If path doesn't exist, serve index.html (SPA fallback)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      
      // Set content type
      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };
      
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(data);
    });
  });
}

async function prerenderRoutes() {
  console.log('🚀 Starting prerender process...');
  
  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Error: Build output not found. Run "ng build" first.');
    process.exit(1);
  }
  
  // Start static server
  const server = createStaticServer(DIST_DIR);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`📡 Static server running on http://localhost:${PORT}`);
  
  // Launch browser
  // Chromium do Playwright quando instalado; senão o Edge/Chrome da máquina.
  const browser = await chromium.launch().catch(() =>
    chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' })),
  );
  const context = await browser.newContext();
  
  for (const route of ROUTES) {
    try {
      console.log(`\n📄 Prerendering: ${route}`);
      const page = await context.newPage();
      
      // Navigate to route
      await page.goto(`http://localhost:${PORT}${route}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      // Wait a bit more for any dynamic content
      await page.waitForTimeout(2000);
      
      // Get the rendered HTML
      const html = await page.content();
      
      // Determine output path
      let outputPath;
      if (route === '/') {
        outputPath = path.join(DIST_DIR, 'index.html');
      } else {
        // Create route directory and index.html
        const routeDir = path.join(DIST_DIR, route);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        outputPath = path.join(routeDir, 'index.html');
      }
      
      // Write HTML file
      fs.writeFileSync(outputPath, html, 'utf-8');
      console.log(`✅ Saved: ${outputPath.replace(DIST_DIR, '')}`);
      
      await page.close();
    } catch (error) {
      console.error(`❌ Error prerendering ${route}:`, error.message);
    }
  }
  
  // Cleanup
  await browser.close();
  server.close();
  
  console.log('\n🎉 Prerender complete! Static HTML files generated.');
  console.log(`📦 Output directory: ${DIST_DIR}`);
}

// Run prerender
prerenderRoutes().catch((error) => {
  console.error('❌ Prerender failed:', error);
  process.exit(1);
});
