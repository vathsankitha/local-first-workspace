import './globals.css';

export const metadata = {
  title: 'Local-First Workspace',
  description: 'Collaborative documents that keep working offline',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
