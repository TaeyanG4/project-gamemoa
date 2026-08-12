import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import "./app.css";
import { Layout } from "./components/layout/Layout";
import { AuthProvider } from "./features/auth";
import { LoginModal } from "./components/ui/LoginModal";

export default function App() {
  return (
    <html lang="ko" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>gamemoa — 심심할 틈 없이, 게임을 한곳에</title>
        <meta name="description" content="설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Google Identity Services library for OAuth login */}
        <script src="https://accounts.google.com/gsi/client" async defer />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-text-primary antialiased">
        <AuthProvider>
          <Layout>
            <Outlet />
          </Layout>
          <LoginModal />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
