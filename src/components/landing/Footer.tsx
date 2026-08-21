import { Link } from "react-router-dom";
import { GraduationCap, Mail, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Disclaimer Banner */}
      <div className="bg-accent/10 border-b border-primary-foreground/10">
        <div className="container-main px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start gap-4 max-w-4xl mx-auto">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xl">⚠️</span>
            </div>
            <div>
              <h4 className="font-semibold text-accent mb-1">Important Disclaimer</h4>
              <p className="text-sm text-primary-foreground/80 leading-relaxed">
                <strong>This is a reference & learning tool only.</strong> Users must add original work, 
                understand content fully, rewrite in their own words, and be ready to defend their project. 
                jmk provides research assistance and ideas – not content for direct submission. 
                Academic integrity is your responsibility.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-main px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-2xl font-heading font-bold">jmk</span>
            </Link>
            <p className="text-primary-foreground/70 mb-6 max-w-md">
              Smart Project Topic Selection & Research Accelerator for Nigerian Students. 
              Helping you achieve excellent academic results with AI-powered tools.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="mailto:support@jmk.ng" 
                className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-accent transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@jmk.ng
              </a>
              <a 
                href="#" 
                className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-accent transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/#features" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/academic-integrity" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  Academic Integrity
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/60">
            © 2025 jmk. All rights reserved.
          </p>
          <p className="text-sm text-primary-foreground/60">
            Made with ❤️ for Nigerian Students
          </p>
        </div>
      </div>
    </footer>
  );
}
