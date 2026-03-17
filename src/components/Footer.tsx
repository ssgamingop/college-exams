import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/30 py-4 px-6">
      <p className="text-center text-xs text-muted-foreground/60 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <span>Exam Scheduler</span>
        <span>·</span>
        <span>
          Built by{" "}
          <a href="https://www.instagram.com/sasankawrites" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Sasanka</a>
          {" & "}
          <a href="https://www.instagram.com/somyajeet.op" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Somyajeet</a>
        </span>
        <span>·</span>
        <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
        <span>·</span>
        <Link to="/terms-and-conditions" className="hover:text-primary transition-colors">Terms</Link>
        <span>·</span>
        <Link to="/credits" className="hover:text-primary transition-colors">Credits</Link>
      </p>
    </footer>
  );
}
