import './globals.css';
import Shell from '../components/Shell';

export const metadata = {
  title: 'Attestation CRM',
  description: 'Client, case, vendor & payment management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
