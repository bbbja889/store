export function Footer() {
  return (
    <footer className="py-6 text-center text-sm text-[var(--color-text-muted)] border-t border-[var(--color-border-default)] mt-auto">
      <p>&copy; {new Date().getFullYear()} Applet. All rights reserved.</p>
    </footer>
  );
}
