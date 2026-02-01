import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container-main">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="text-2xl font-heading font-bold text-primary">jmk</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Features
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Pricing
            </Link>
            <Link to="/#testimonials" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Testimonials
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button variant="accent" asChild>
              <Link to="/signup">Sign Up Free</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-primary"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 bg-card"
          >
            <div className="px-4 py-6 space-y-4">
              <Link
                to="/#features"
                className="block py-2 text-muted-foreground hover:text-primary font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                to="/pricing"
                className="block py-2 text-muted-foreground hover:text-primary font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/#testimonials"
                className="block py-2 text-muted-foreground hover:text-primary font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Testimonials
              </Link>
              <div className="pt-4 space-y-3 border-t border-border">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button variant="accent" className="w-full" asChild>
                  <Link to="/signup">Sign Up Free</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
